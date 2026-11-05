import { formatRecognizedOcrText } from "../ocr-panel";
import type { QrCodeItem } from "../qr-panel";

export interface RecognitionSource {
  readonly id: string; readonly revision: number; readonly width: number; readonly height: number; readonly byteSize: number;
}
export type RecognitionKind = "text" | "qr";
export interface RecognitionRequest {
  readonly source: Readonly<RecognitionSource>; readonly kind: RecognitionKind; readonly language?: string;
}
export interface RecognitionBackendResult { readonly text: string; readonly codes: readonly QrCodeItem[] }
export interface RecognitionResult {
  readonly source: Readonly<RecognitionSource>; readonly kind: RecognitionKind;
  readonly rawText: string; readonly displayText: string; readonly codes: readonly Readonly<QrCodeItem>[];
}
export interface RecognitionBackend {
  languages(signal: AbortSignal): Promise<readonly string[]>;
  recognize(request: RecognitionRequest, signal: AbortSignal): Promise<RecognitionBackendResult>;
}
export const MAX_RECOGNITION_OUTPUT_BYTES = 1024 * 1024;
const encoder = new TextEncoder();
function boundedString(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.length <= limit && encoder.encode(value).length <= limit;
}
function sourceCopy(source: RecognitionSource): Readonly<RecognitionSource> {
  if (!boundedString(source.id, 256) || !source.id || !Number.isSafeInteger(source.revision) || source.revision < 0
    || !Number.isSafeInteger(source.width) || source.width < 1 || source.width > 16_384
    || !Number.isSafeInteger(source.height) || source.height < 1 || source.height > 16_384
    || source.width * source.height > 16_777_216 || !Number.isSafeInteger(source.byteSize)
    || source.byteSize < 1 || source.byteSize > 32 * 1024 * 1024) throw new RangeError("Invalid recognition source");
  return Object.freeze({ id: source.id, revision: source.revision, width: source.width, height: source.height, byteSize: source.byteSize });
}

/** No native calls, clipboard writes or URL activation. Backend IDs must resolve to the requested revision. */
export class RecognitionController {
  private source?: Readonly<RecognitionSource>;
  private sequence = 0;
  private languageSequence = 0;
  private requestAbort?: AbortController;
  private languageAbort?: AbortController;
  private supported: readonly string[] = Object.freeze([]);
  private result: RecognitionResult | null = null;
  private phase: "idle" | "running" | "done" | "failed" = "idle";
  private message: string | null = null;
  constructor(private readonly backend: RecognitionBackend) {}
  get state() { return Object.freeze({ phase: this.phase, source: this.source ?? null, result: this.result, error: this.message, languages: this.supported }); }
  select(source: RecognitionSource | null): void {
    const next = source === null ? undefined : sourceCopy(source);
    this.cancel(); this.source = next; this.result = null; this.message = null;
  }
  cancel(): void {
    this.sequence++; this.requestAbort?.abort(); this.requestAbort = undefined;
    this.phase = "idle";
  }
  dispose(): void {
    this.select(null); this.languageSequence++; this.languageAbort?.abort(); this.languageAbort = undefined;
    this.supported = Object.freeze([]);
  }
  async loadLanguages(): Promise<readonly string[] | null> {
    const token = ++this.languageSequence;
    this.languageAbort?.abort(); const abort = new AbortController(); this.languageAbort = abort;
    this.supported = Object.freeze([]); // A failed refresh must not preserve a stale capability claim.
    try {
      const values = await this.backend.languages(abort.signal);
      if (token !== this.languageSequence) return null;
      if (!Array.isArray(values) || values.length > 128 || !values.every(v => typeof v === "string" && /^[A-Za-z][A-Za-z0-9-]{0,63}$/.test(v))) {
        throw new RangeError("Invalid runtime language list");
      }
      this.supported = Object.freeze([...new Set(values)]); this.message = null;
      return this.supported;
    } catch (error) {
      if (token !== this.languageSequence) return null;
      this.message = error instanceof Error ? error.message : "Language discovery failed";
      throw error;
    } finally { if (this.languageAbort === abort) this.languageAbort = undefined; }
  }
  async recognize(kind: RecognitionKind, options: { language?: string; preserveLineBreaks?: boolean } = {}): Promise<RecognitionResult | null> {
    if (!this.source) throw new Error("Select a source image first");
    if (kind !== "text" && kind !== "qr") throw new RangeError("Unsupported recognition kind");
    if (kind === "text" && (!options.language || !this.supported.includes(options.language))) throw new RangeError("Language is not supported by the runtime");
    if (options.preserveLineBreaks !== undefined && typeof options.preserveLineBreaks !== "boolean") throw new RangeError("Invalid line-break option");
    const source = this.source, preserve = options.preserveLineBreaks ?? true;
    const request = Object.freeze({ source, kind, language: kind === "text" ? options.language : undefined });
    this.cancel(); const token = this.sequence, abort = new AbortController(); this.requestAbort = abort;
    this.phase = "running"; this.result = null; this.message = null;
    try {
      const raw = await this.backend.recognize(request, abort.signal);
      if (token !== this.sequence || this.source !== source) return null;
      if (!raw || !boundedString(raw.text, MAX_RECOGNITION_OUTPUT_BYTES) || !Array.isArray(raw.codes) || raw.codes.length > 128) throw new RangeError("Recognition output exceeded bounds");
      let bytes = encoder.encode(raw.text).length;
      const ids = new Set<string>();
      const codes = raw.codes.map(code => {
        if (!code || !boundedString(code.id, 256) || !code.id || ids.has(code.id)
          || !boundedString(code.payload, 8192) || (code.symbology !== undefined && !boundedString(code.symbology, 128))) throw new RangeError("Invalid QR output");
        ids.add(code.id); bytes += encoder.encode(code.payload).length + encoder.encode(code.id).length + encoder.encode(code.symbology ?? "").length;
        if (bytes > MAX_RECOGNITION_OUTPUT_BYTES) throw new RangeError("Recognition output exceeded bounds");
        return Object.freeze({ id: code.id, payload: code.payload, symbology: code.symbology });
      });
      this.result = Object.freeze({ source, kind, rawText: raw.text,
        displayText: formatRecognizedOcrText(raw.text, preserve), codes: Object.freeze(codes) });
      this.phase = "done"; return this.result;
    } catch (error) {
      if (token !== this.sequence || this.source !== source) return null;
      this.phase = "failed"; this.message = error instanceof Error ? error.message : "Recognition failed";
      throw error;
    } finally { if (this.requestAbort === abort) this.requestAbort = undefined; }
  }
}
