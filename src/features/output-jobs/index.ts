import type { ImageDocument } from "../../contracts/media";
import { safeExportName, type ExportFormat } from "../export/names";

export type OutputAction = "copy" | "save" | "print" | "drag";
export interface OutputSource extends Readonly<ImageDocument> { readonly revision: number }
export interface OutputRequest {
  readonly id: string; readonly source: OutputSource;
  readonly options: { readonly format: ExportFormat; readonly quality: number; readonly name: string };
  readonly actions: readonly OutputAction[];
}
export interface OutputArtifact<T> { readonly value: T; release(): void }
/** not-performed is a guarantee of no side effect; an exception means outcome unknown. */
export type OutputActionResult = { readonly status: "completed" | "cancelled" | "not-performed"; readonly error?: string };
export interface OutputAdapters<T> {
  render(request: OutputRequest, signal: AbortSignal): Promise<OutputArtifact<T>>;
  handlers: Partial<Record<OutputAction, (artifact: T, request: OutputRequest, signal: AbortSignal) => Promise<OutputActionResult>>>;
}
type Status = "done" | "failed" | "partial" | "cancelled" | "stale" | "uncertain";
export interface OutputReceipt {
  readonly id: string; readonly sourceId: string; readonly revision: number; readonly status: Status;
  readonly completed: readonly OutputAction[]; readonly uncertain: OutputAction | null;
  readonly error: string | null; readonly cleanupFailed: boolean;
}
interface Job { request: OutputRequest; fingerprint: string; completed: Set<OutputAction>; status: Status; uncertain: OutputAction | null; error: string | null; cleanupFailed: boolean }
const actions = new Set<OutputAction>(["copy", "save", "print", "drag"]);
function snapshot(input: OutputRequest): OutputRequest {
  const s = input.source, o = input.options;
  if (typeof input.id !== "string" || !input.id.trim() || input.id.length > 128 || !s || !o
    || typeof s.id !== "string" || !s.id || s.id.length > 256 || !Number.isSafeInteger(s.revision) || s.revision < 0
    || typeof s.name !== "string" || s.name.length > 512 || typeof s.src !== "string" || s.src.length > 4096
    || !s.src || typeof s.mimeType !== "string" || s.mimeType.length > 128
    || !Number.isSafeInteger(s.width) || s.width < 1 || s.width > 16_384
    || !Number.isSafeInteger(s.height) || s.height < 1 || s.height > 16_384 || s.width * s.height > 16_777_216
    || !Number.isSafeInteger(s.byteSize) || s.byteSize < 1 || s.byteSize > 32 * 1024 * 1024
    || !Number.isInteger(o.quality) || o.quality < 1 || o.quality > 100
    || typeof o.name !== "string" || o.name.length > 512 || !Array.isArray(input.actions)
    || !input.actions.length || input.actions.length > 4 || new Set(input.actions).size !== input.actions.length
    || !input.actions.every(a => actions.has(a))) throw new RangeError("Invalid output request");
  return Object.freeze({ id: input.id, source: Object.freeze({ id: s.id, revision: s.revision, name: s.name, src: s.src,
    width: s.width, height: s.height, byteSize: s.byteSize, mimeType: s.mimeType }),
    options: Object.freeze({ format: o.format, quality: o.quality, name: safeExportName(o.name, o.format) }),
    actions: Object.freeze([...input.actions]) });
}

/** One active job; bounded intent ledger; no OS side effect without an injected handler. */
export class OutputCoordinator<T> {
  private selected: { id: string; revision: number } | null = null;
  private readonly jobs = new Map<string, Job>();
  private active?: { job: Job; abort: AbortController; promise: Promise<OutputReceipt> };
  private disposed = false;
  constructor(private readonly adapters: OutputAdapters<T>) {}
  select(source: { readonly id: string; readonly revision: number } | null): void {
    if (source && (typeof source.id !== "string" || !source.id || source.id.length > 256 || !Number.isSafeInteger(source.revision) || source.revision < 0)) throw new RangeError("Invalid source identity");
    if (this.selected?.id !== source?.id || this.selected?.revision !== source?.revision) this.cancel();
    this.selected = source ? { id: source.id, revision: source.revision } : null;
  }
  cancel(): void { this.active?.abort.abort(); }
  dispose(): void { this.disposed = true; this.selected = null; this.cancel(); }
  private isSelected(job: Job): boolean { return this.selected?.id === job.request.source.id && this.selected.revision === job.request.source.revision; }
  private receipt(job: Job): OutputReceipt {
    return Object.freeze({ id: job.request.id, sourceId: job.request.source.id, revision: job.request.source.revision,
      status: job.status, completed: Object.freeze([...job.completed]), uncertain: job.uncertain, error: job.error, cleanupFailed: job.cleanupFailed });
  }
  /** Explicit reconciliation only after verifying whether an ambiguous external operation happened. */
  reconcile(id: string, performed: boolean): void {
    const job = this.jobs.get(id);
    if (!job?.uncertain || typeof performed !== "boolean" || this.active?.job === job) throw new Error("No settled uncertain action to reconcile");
    if (performed) job.completed.add(job.uncertain);
    job.uncertain = null; job.status = job.completed.size ? "partial" : "failed"; job.error = null;
  }
  run(input: OutputRequest): Promise<OutputReceipt> {
    if (this.disposed) throw new Error("Output coordinator is disposed");
    const request = snapshot(input), fingerprint = JSON.stringify(request);
    let job = this.jobs.get(request.id);
    if (job && job.fingerprint !== fingerprint) throw new Error("Intent ID is bound to another immutable request");
    if (this.active) {
      if (this.active.job === job) return this.active.promise;
      throw new Error("An output job is still pending");
    }
    if (job?.completed.size === request.actions.length) { job.status = "done"; return Promise.resolve(this.receipt(job)); }
    if (job && (job.uncertain || job.status === "cancelled" || job.status === "stale")) return Promise.resolve(this.receipt(job));
    if (!job) {
      if (this.jobs.size >= 256) throw new RangeError("Output intent ledger is full; create a new workspace coordinator");
      if (request.actions.some(a => typeof this.adapters.handlers[a] !== "function")) throw new Error("Output capability unavailable");
      job = { request, fingerprint, completed: new Set(), status: "failed", uncertain: null, error: null, cleanupFailed: false };
      this.jobs.set(request.id, job);
    }
    if (!this.isSelected(job)) throw new Error("Output source is no longer selected");
    const current = job, abort = new AbortController();
    // Defer adapters until the active slot exists, including synchronous reentrant cancellation.
    const promise = Promise.resolve().then(() => this.execute(current, abort)).finally(() => {
      if (this.active?.promise === promise) this.active = undefined;
    });
    this.active = { job, abort, promise }; return promise;
  }
  private async execute(job: Job, abort: AbortController): Promise<OutputReceipt> {
    let artifact: OutputArtifact<T> | undefined;
    job.error = null; job.cleanupFailed = false;
    const interrupted = () => {
      if (abort.signal.aborted || !this.isSelected(job)) {
        job.status = this.isSelected(job) ? "cancelled" : "stale"; return true;
      }
      return false;
    };
    try {
      if (interrupted()) return this.receipt(job);
      artifact = await this.adapters.render(job.request, abort.signal);
      if (!artifact || typeof artifact.release !== "function") throw new TypeError("Renderer must return an owned artifact");
      if (!interrupted()) {
        for (const action of job.request.actions) {
          if (job.completed.has(action)) continue;
          if (interrupted()) break;
          let outcome: OutputActionResult;
          try {
            outcome = await this.adapters.handlers[action]!(artifact.value, job.request, abort.signal);
            if (!outcome || !["completed", "cancelled", "not-performed"].includes(outcome.status)) throw new Error("Ambiguous output result");
          } catch (error) {
            job.uncertain = action; job.status = "uncertain";
            job.error = error instanceof Error ? error.message : "Output outcome unknown"; break;
          }
          if (outcome.status === "completed") job.completed.add(action);
          else {
            job.error = outcome.error ?? null;
            job.status = outcome.status === "cancelled" ? "cancelled" : job.completed.size ? "partial" : "failed";
            break;
          }
        }
        if (!job.uncertain && job.completed.size === job.request.actions.length) job.status = "done";
        if (!job.uncertain && !this.isSelected(job)) job.status = "stale";
      }
    } catch (error) {
      job.error = error instanceof Error ? error.message : "Rendering failed";
      if (!interrupted()) job.status = job.completed.size ? "partial" : "failed";
    } finally {
      if (artifact && typeof artifact.release === "function") {
        try { artifact.release(); } catch { job.cleanupFailed = true; }
      }
    }
    return this.receipt(job);
  }
}
