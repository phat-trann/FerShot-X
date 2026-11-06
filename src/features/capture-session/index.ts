import { planStitchBudget } from "../stitch-budget";

export interface DisplayGeometry {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}
export interface CaptureArea { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface CaptureFrame<T> {
  readonly value: T;
  readonly width: number;
  readonly height: number;
  readonly byteSize: number;
  release(): void;
}
export interface CaptureArtifact<T> { readonly value: T; release(): void }
export interface CaptureBudget {
  readonly maxFrames: number;
  readonly maxBytes: number;
  readonly maxPixels: number;
  readonly overlap: number;
}
export interface CaptureSessionAdapters<F, O> {
  acquire(display: Readonly<DisplayGeometry>, signal: AbortSignal): Promise<CaptureFrame<F>>;
  stitch(frames: readonly CaptureFrame<F>[], signal: AbortSignal): Promise<CaptureArtifact<O>>;
}
type Phase = "idle" | "collecting" | "stitching" | "done" | "cancelled" | "failed";
interface Session<F> {
  id: number; display: Readonly<DisplayGeometry>; frames: CaptureFrame<F>[];
  phase: Phase; bytes: number; pixels: number; abort: AbortController; acquiring?: AbortController;
}
const positive = (n: number) => Number.isSafeInteger(n) && n > 0;
function displayCopy(d: DisplayGeometry): Readonly<DisplayGeometry> {
  if (!d.id || d.id.length > 256 || !Number.isSafeInteger(d.x) || !Number.isSafeInteger(d.y)
    || !positive(d.width) || !positive(d.height) || !Number.isFinite(d.scale) || d.scale <= 0) {
    throw new RangeError("Invalid explicit display geometry");
  }
  return Object.freeze({ id: d.id, x: d.x, y: d.y, width: d.width, height: d.height, scale: d.scale });
}
function sameDisplay(a: DisplayGeometry, b: DisplayGeometry): boolean {
  return a.id === b.id && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height && a.scale === b.scale;
}

/** Manual frame collection only. Adapters own OS work; acquired frames transfer to this controller. */
export class CaptureSessionController<F, O> {
  private generation = 0;
  private active?: Session<F>;
  private phase: Phase = "idle";
  private readonly released = new WeakSet<object>();
  private repeat?: { display: Readonly<DisplayGeometry>; area: Readonly<CaptureArea> };
  private readonly budget: Readonly<CaptureBudget>;
  constructor(private readonly adapters: CaptureSessionAdapters<F, O>, budget: CaptureBudget) {
    if (!positive(budget.maxFrames) || budget.maxFrames > 256 || !positive(budget.maxBytes)
      || budget.maxBytes > 256 * 1024 * 1024 || !positive(budget.maxPixels) || budget.maxPixels > 16_777_216
      || !Number.isSafeInteger(budget.overlap) || budget.overlap < 0) throw new RangeError("Invalid capture budget");
    this.budget = Object.freeze({ ...budget });
  }
  get state() { return Object.freeze({ phase: this.phase, operationId: this.generation, frameCount: this.active?.frames.length ?? 0 }); }
  start(display: DisplayGeometry): number {
    const copy = displayCopy(display);
    if (this.generation >= Number.MAX_SAFE_INTEGER) throw new RangeError("Operation ID exhausted");
    this.cancel();
    this.getRepeatArea(copy); // A different display invalidates remembered geometry permanently.
    const s: Session<F> = { id: ++this.generation, display: copy, frames: [], phase: "collecting",
      bytes: 0, pixels: 0, abort: new AbortController() };
    this.active = s;
    this.phase = "collecting";
    return s.id;
  }
  setRepeatArea(display: DisplayGeometry, area: CaptureArea): void {
    const copy = displayCopy(display);
    if (![area.x, area.y].every(n => Number.isSafeInteger(n) && n >= 0) || !positive(area.width) || !positive(area.height)
      || area.x + area.width > copy.width || area.y + area.height > copy.height) throw new RangeError("Area outside display");
    this.repeat = { display: copy, area: Object.freeze({ ...area }) };
  }
  getRepeatArea(display: DisplayGeometry): Readonly<CaptureArea> | null {
    const copy = displayCopy(display);
    if (this.repeat && !sameDisplay(this.repeat.display, copy)) this.repeat = undefined;
    return this.repeat?.area ?? null;
  }
  clearRepeatArea(): void { this.repeat = undefined; }
  private release(resource: { release(): void }): void {
    if (this.released.has(resource)) return;
    this.released.add(resource);
    try { resource.release(); } catch { /* Cleanup errors must not orphan other owned frames. */ }
  }
  private drain(s: Session<F>): void { for (const frame of s.frames.splice(0)) this.release(frame); }
  cancel(): void {
    const s = this.active;
    if (!s) return;
    this.active = undefined;
    this.phase = "cancelled";
    s.abort.abort(); s.acquiring?.abort();
    // An in-flight stitch adapter may still be reading frames until its promise settles.
    if (s.phase !== "stitching") this.drain(s);
  }
  async capture(): Promise<boolean> {
    const s = this.active;
    if (!s || s.phase !== "collecting") return false;
    if (s.acquiring) throw new Error("A frame acquisition is already pending");
    const request = new AbortController(); s.acquiring = request;
    let frame: CaptureFrame<F> | undefined;
    try {
      frame = await this.adapters.acquire(s.display, request.signal);
      if (this.active !== s || s.phase !== "collecting") { this.release(frame); return false; }
      const first = s.frames[0];
      const pixels = frame.width * frame.height;
      if (this.released.has(frame) || s.frames.includes(frame) || !positive(frame.width) || !positive(frame.height)
        || !positive(frame.byteSize) || !positive(pixels) || s.frames.length + 1 > this.budget.maxFrames
        || s.bytes + frame.byteSize > this.budget.maxBytes || s.pixels + pixels > this.budget.maxPixels
        || (first && (first.width !== frame.width || first.height !== frame.height))) throw new RangeError("Capture frame budget or geometry exceeded");
      planStitchBudget(s.frames.length + 1, frame.width, frame.height, this.budget.overlap, this.budget.maxPixels);
      s.frames.push(frame); s.bytes += frame.byteSize; s.pixels += pixels;
      return true;
    } catch (error) {
      if (frame) this.release(frame);
      if (this.active !== s || s.phase !== "collecting") return false;
      this.cancel(); this.phase = "failed";
      throw error;
    } finally { if (s.acquiring === request) s.acquiring = undefined; }
  }
  async stop(): Promise<CaptureArtifact<O> | null> {
    const s = this.active;
    if (!s || s.phase !== "collecting") return null;
    s.acquiring?.abort();
    if (!s.frames.length) { this.cancel(); return null; }
    s.phase = "stitching"; this.phase = "stitching";
    try {
      const result = await this.adapters.stitch(Object.freeze([...s.frames]), s.abort.signal);
      if (this.active !== s) { this.release(result); return null; }
      this.active = undefined; this.phase = "done";
      return result; // Caller owns the resulting artifact from this point.
    } catch (error) {
      if (this.active !== s) return null;
      this.active = undefined; this.phase = "failed";
      throw error;
    } finally { this.drain(s); }
  }
}
