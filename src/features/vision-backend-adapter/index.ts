import type { RecognitionBackend, RecognitionBackendResult, RecognitionRequest, RecognitionSource } from "../recognition-workflow";

export const VISION_ADAPTER_LIMITS = Object.freeze({ inputBytes: 32 * 1024 * 1024, dimension: 16_384, pixels: 16_777_216, results: 128, outputBytes: 256 * 1024, languages: 128 });
export interface VisionSourceLease {
  readonly source: Readonly<RecognitionSource>;
  readonly bytes: Uint8Array;
  release(): void;
}
/** Local port: a future root adapter must serialize imageBytes to Rust Vec<u8>. */
export interface VisionPortRequest {
  readonly schemaVersion: 1;
  readonly mode: "ocr" | "qr";
  readonly imageBytes: Uint8Array;
  readonly languages: readonly string[];
  readonly preserveLineBreaks: true;
  readonly usesLanguageCorrection: boolean;
  readonly maxResults: number;
}
export interface VisionAdapterPorts {
  resolve(source: Readonly<RecognitionSource>, signal: AbortSignal): Promise<VisionSourceLease>;
  languages(signal: AbortSignal): Promise<unknown>;
  recognize(request: Readonly<VisionPortRequest>, signal: AbortSignal): Promise<unknown>;
}
const encoder = new TextEncoder();
function abortIfNeeded(signal: AbortSignal): void {
  if (signal.aborted) { const error = new Error("Recognition cancelled"); error.name = "AbortError"; throw error; }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected Vision record");
  return value as Record<string, unknown>;
}
function text(value: unknown, cap: number): string {
  if (typeof value !== "string" || value.length > cap) throw new RangeError("Vision string exceeded bounds");
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError("Invalid Unicode in Vision output");
    } else if (code >= 0xdc00 && code <= 0xdfff) throw new TypeError("Invalid Unicode in Vision output");
  }
  if (encoder.encode(value).length > cap) throw new RangeError("Vision UTF-8 bytes exceeded bounds");
  return value;
}
function languageList(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > VISION_ADAPTER_LIMITS.languages) throw new RangeError("Invalid Vision language list");
  const languages: string[] = [];
  for (const raw of value) {
    const language = text(raw, 32);
    // Intersection of C18 and A33 language syntax; underscore aliases require a root policy.
    if (!/^[A-Za-z][A-Za-z0-9-]{0,31}$/.test(language)) throw new RangeError("Invalid Vision language tag");
    if (!languages.includes(language)) languages.push(language);
  }
  return Object.freeze(languages);
}
function sourceCopy(value: RecognitionSource): Readonly<RecognitionSource> {
  const id = text(value.id, 256);
  if (!id || !Number.isSafeInteger(value.revision) || value.revision < 0
    || ![value.width, value.height].every(v => Number.isSafeInteger(v) && v > 0 && v <= VISION_ADAPTER_LIMITS.dimension)
    || value.width * value.height > VISION_ADAPTER_LIMITS.pixels || !Number.isSafeInteger(value.byteSize)
    || value.byteSize < 1 || value.byteSize > VISION_ADAPTER_LIMITS.inputBytes) throw new RangeError("Invalid Vision source");
  return Object.freeze({ id, revision: value.revision, width: value.width, height: value.height, byteSize: value.byteSize });
}
function sameSource(a: RecognitionSource, b: RecognitionSource): boolean {
  return a.id === b.id && a.revision === b.revision && a.width === b.width && a.height === b.height && a.byteSize === b.byteSize;
}

/** No OS access: ports are injected, responses are untrusted, and leases remain caller-owned until resolved. */
export function createVisionBackendAdapter(ports: VisionAdapterPorts, maxResults = 50): RecognitionBackend {
  if (!Number.isSafeInteger(maxResults) || maxResults < 1 || maxResults > VISION_ADAPTER_LIMITS.results) throw new RangeError("Invalid Vision result cap");
  return Object.freeze({
    async languages(signal: AbortSignal): Promise<readonly string[]> {
      abortIfNeeded(signal);
      const raw = await ports.languages(signal);
      abortIfNeeded(signal);
      return languageList(raw);
    },
    async recognize(request: RecognitionRequest, signal: AbortSignal): Promise<RecognitionBackendResult> {
      abortIfNeeded(signal);
      const source = sourceCopy(request.source);
      const kind = request.kind;
      if (kind !== "text" && kind !== "qr") throw new RangeError("Invalid recognition kind");
      const languages = kind === "text" ? languageList([request.language]) : Object.freeze([] as string[]);
      const lease = await ports.resolve(source, signal);
      if (!lease || typeof lease.release !== "function") throw new TypeError("Vision source requires an owned lease");
      try {
        abortIfNeeded(signal);
        if (!sameSource(source, sourceCopy(lease.source)) || !(lease.bytes instanceof Uint8Array)
          || lease.bytes.byteLength !== source.byteSize) throw new RangeError("Resolved Vision source/revision mismatch");
        const wire: VisionPortRequest = Object.freeze({ schemaVersion: 1, mode: kind === "text" ? "ocr" : "qr",
          imageBytes: lease.bytes.slice(), languages, preserveLineBreaks: true, usesLanguageCorrection: kind === "text", maxResults });
        abortIfNeeded(signal);
        const response = await ports.recognize(wire, signal);
        abortIfNeeded(signal);
        const raw = record(response);
        if (raw.schemaVersion !== 1 || raw.width !== source.width || raw.height !== source.height
          || !Array.isArray(raw.textBlocks) || !Array.isArray(raw.qrCodes)
          || raw.textBlocks.length > maxResults || raw.qrCodes.length > maxResults) throw new RangeError("Invalid Vision response envelope");
        const resolved = languageList(raw.resolvedLanguages);
        if (resolved.length !== languages.length || !resolved.every((v, i) => v === languages[i])) throw new RangeError("Vision response language mismatch");
        const recognized = text(raw.recognizedText, VISION_ADAPTER_LIMITS.outputBytes);
        let bytes = 0;
        const blocks = raw.textBlocks.map(value => {
          const block = record(value), valueText = text(block.text, VISION_ADAPTER_LIMITS.outputBytes);
          if (!valueText || typeof block.confidence !== "number" || !Number.isFinite(block.confidence)
            || block.confidence < 0 || block.confidence > 1) throw new RangeError("Invalid Vision text observation");
          bytes += encoder.encode(valueText).length;
          if (bytes > VISION_ADAPTER_LIMITS.outputBytes) throw new RangeError("Vision output exceeded byte budget");
          return valueText;
        });
        if (recognized !== blocks.join("\n")) throw new RangeError("Vision text summary mismatch");
        const codes = raw.qrCodes.map((value, index) => {
          const qr = record(value), payload = text(qr.payload, 8192), symbology = text(qr.symbology, 128);
          if (!payload || !symbology) throw new RangeError("Invalid Vision QR observation");
          bytes += encoder.encode(payload).length + encoder.encode(symbology).length;
          if (bytes > VISION_ADAPTER_LIMITS.outputBytes) throw new RangeError("Vision output exceeded byte budget");
          return Object.freeze({ id: `${source.revision}:qr:${index}`, payload, symbology });
        });
        if (bytes > VISION_ADAPTER_LIMITS.outputBytes || (kind === "text" && codes.length) || (kind === "qr" && blocks.length)) throw new RangeError("Vision response exceeded mode/output bounds");
        return Object.freeze({ text: recognized, codes: Object.freeze(codes) });
      } catch (error) {
        abortIfNeeded(signal);
        throw error;
      } finally { lease.release(); }
    },
  });
}
