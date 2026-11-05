import type { CaptureFrame, CaptureSessionAdapters, DisplayGeometry } from "../capture-session";

export const STITCH_ADAPTER_LIMITS = Object.freeze({ frames: 64, dimension: 8192, outputHeight: 32_768, inputBytes: 64 * 1024 * 1024, inputPixels: 16_777_216, outputBytes: 64 * 1024 * 1024, outputPixels: 16_777_216 });
export interface RgbaImage { readonly width: number; readonly height: number; readonly rgba: Uint8Array }
export interface StitchAdapterOptions {
  readonly direction?: "down" | "up";
  readonly minOverlapRows?: number;
  readonly maxOutputHeight?: number;
  readonly maxChannelDiff?: number;
  readonly maxInputBytes?: number;
  readonly maxInputPixels?: number;
  readonly maxOutputBytes?: number;
  readonly maxOutputPixels?: number;
}
export interface StitchPortRequest {
  readonly frames: readonly Readonly<RgbaImage>[];
  readonly options: Readonly<{ direction: "down" | "up"; minOverlapRows: number; maxOutputHeight: number; maxChannelDiff: number }>;
}
export interface StitchOutputLease { readonly value: unknown; release(): void }
export interface StitchAdapterPorts {
  acquire(display: Readonly<DisplayGeometry>, signal: AbortSignal): Promise<CaptureFrame<RgbaImage>>;
  stitch(request: Readonly<StitchPortRequest>, signal: AbortSignal): Promise<StitchOutputLease>;
}
const positive = (n: number) => Number.isSafeInteger(n) && n > 0;
function checkAbort(signal: AbortSignal): void {
  if (signal.aborted) { const error = new Error("Stitch cancelled"); error.name = "AbortError"; throw error; }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid stitch result record");
  return value as Record<string, unknown>;
}

/** Local port only. C17 retains input-frame ownership; a valid output lease transfers to the returned artifact. */
export function createStitchBackendAdapter(ports: StitchAdapterPorts, options: StitchAdapterOptions = {}): CaptureSessionAdapters<RgbaImage, RgbaImage> {
  const direction = options.direction ?? "down", minOverlapRows = options.minOverlapRows ?? 2;
  const maxOutputHeight = options.maxOutputHeight ?? 8192, maxChannelDiff = options.maxChannelDiff ?? 0;
  const budgets = Object.freeze({ inputBytes: options.maxInputBytes ?? STITCH_ADAPTER_LIMITS.inputBytes,
    inputPixels: options.maxInputPixels ?? STITCH_ADAPTER_LIMITS.inputPixels,
    outputBytes: options.maxOutputBytes ?? STITCH_ADAPTER_LIMITS.outputBytes,
    outputPixels: options.maxOutputPixels ?? STITCH_ADAPTER_LIMITS.outputPixels });
  if (!["down", "up"].includes(direction) || !positive(minOverlapRows) || minOverlapRows < 2 || minOverlapRows > STITCH_ADAPTER_LIMITS.dimension
    || !positive(maxOutputHeight) || maxOutputHeight > STITCH_ADAPTER_LIMITS.outputHeight
    || !Number.isSafeInteger(maxChannelDiff) || maxChannelDiff < 0 || maxChannelDiff > 255
    || !positive(budgets.inputBytes) || budgets.inputBytes > STITCH_ADAPTER_LIMITS.inputBytes
    || !positive(budgets.inputPixels) || budgets.inputPixels > STITCH_ADAPTER_LIMITS.inputPixels
    || !positive(budgets.outputBytes) || budgets.outputBytes > STITCH_ADAPTER_LIMITS.outputBytes
    || !positive(budgets.outputPixels) || budgets.outputPixels > STITCH_ADAPTER_LIMITS.outputPixels) throw new RangeError("Invalid stitch options/budgets");
  const wireOptions = Object.freeze({ direction, minOverlapRows, maxOutputHeight, maxChannelDiff });
  return Object.freeze({
    async acquire(display: Readonly<DisplayGeometry>, signal: AbortSignal): Promise<CaptureFrame<RgbaImage>> {
      checkAbort(signal);
      // The capture controller handles validation and releases late acquisition results.
      return ports.acquire(display, signal);
    },
    async stitch(frames: readonly CaptureFrame<RgbaImage>[], signal: AbortSignal) {
      checkAbort(signal);
      if (!Array.isArray(frames) || frames.length < 1 || frames.length > STITCH_ADAPTER_LIMITS.frames) throw new RangeError("Invalid stitch frame count");
      const seen = new Set<CaptureFrame<RgbaImage>>();
      let inputBytes = 0, inputPixels = 0;
      const first = frames[0];
      // Validate the complete batch before copying or dispatching any frame.
      for (const frame of frames) {
        if (!frame || seen.has(frame) || typeof frame.release !== "function" || !frame.value
          || !positive(frame.width) || frame.width > STITCH_ADAPTER_LIMITS.dimension
          || !positive(frame.height) || frame.height < 2 || frame.height > STITCH_ADAPTER_LIMITS.dimension
          || frame.width !== first.width || frame.height !== first.height || frame.height > maxOutputHeight
          || frame.value.width !== frame.width || frame.value.height !== frame.height
          || !(frame.value.rgba instanceof Uint8Array) || frame.value.rgba.byteLength !== frame.width * frame.height * 4
          || frame.byteSize !== frame.value.rgba.byteLength || (frames.length > 1 && minOverlapRows > frame.height)) throw new RangeError("Invalid stitch frame geometry/RGBA");
        seen.add(frame);
        inputBytes += frame.byteSize; inputPixels += frame.width * frame.height;
        if (inputBytes > budgets.inputBytes || inputPixels > budgets.inputPixels) throw new RangeError("Stitch input budget exceeded");
      }
      if (first.width * first.height > budgets.outputPixels || first.byteSize > budgets.outputBytes) throw new RangeError("Stitch output cannot fit first frame");
      const snapshot = Object.freeze(frames.map(frame => Object.freeze({ width: frame.width, height: frame.height, rgba: frame.value.rgba.slice() })));
      const expectedWidth = first.width, frameHeight = first.height, count = snapshot.length;
      checkAbort(signal);
      let lease: StitchOutputLease;
      try {
        lease = await ports.stitch(Object.freeze({ frames: snapshot, options: wireOptions }), signal);
      } catch (error) {
        checkAbort(signal);
        throw error;
      }
      if (!lease || typeof lease.release !== "function") throw new TypeError("Stitch port must transfer an owned output lease");
      let released = false;
      const release = () => { if (!released) { released = true; lease.release(); } };
      try {
        checkAbort(signal);
        const raw = record(lease.value);
        if (raw.width !== expectedWidth || typeof raw.height !== "number" || !positive(raw.height)
          || raw.height < frameHeight || raw.height > maxOutputHeight || expectedWidth * raw.height > budgets.outputPixels
          || !(raw.rgba instanceof Uint8Array) || raw.rgba.byteLength !== expectedWidth * raw.height * 4
          || raw.rgba.byteLength > budgets.outputBytes || !Array.isArray(raw.matchedOverlaps)
          || typeof raw.skippedDuplicates !== "number" || !Number.isSafeInteger(raw.skippedDuplicates)
          || raw.skippedDuplicates < 0 || raw.skippedDuplicates >= count
          || raw.matchedOverlaps.length !== count - 1 - raw.skippedDuplicates) throw new RangeError("Invalid stitch output envelope/budget");
        let overlapRows = 0;
        for (const overlap of raw.matchedOverlaps) {
          if (typeof overlap !== "number" || !Number.isSafeInteger(overlap) || overlap < minOverlapRows || overlap > frameHeight) throw new RangeError("Invalid stitch overlap result");
          overlapRows += overlap;
        }
        if (raw.height !== frameHeight * (count - raw.skippedDuplicates) - overlapRows) throw new RangeError("Stitch height/overlap mismatch");
        const value = Object.freeze({ width: expectedWidth, height: raw.height, rgba: raw.rgba.slice() });
        return Object.freeze({ value, release });
      } catch (error) {
        release();
        checkAbort(signal);
        throw error;
      }
    },
  });
}
