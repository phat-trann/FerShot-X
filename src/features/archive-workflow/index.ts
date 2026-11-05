import type { ImageDocument } from "../../contracts/media";
export type ArchiveJson = null | boolean | number | string | readonly ArchiveJson[] | { readonly [key: string]: ArchiveJson };
export interface ArchiveLibrary {
  readonly revision: number; readonly images: readonly Readonly<ImageDocument>[];
  readonly selectedId: string | null; readonly annotations: Readonly<Record<string, ArchiveJson>>;
}
export interface ArchiveEntry {
  readonly id: string; readonly name: string; readonly width: number; readonly height: number;
  readonly mimeType: string; readonly bytes: Uint8Array; readonly annotations: ArchiveJson;
}
export interface DecodedArchive { readonly entries: readonly ArchiveEntry[]; readonly selectedId: string | null }
export interface ArchiveImageLease { readonly src: string; release(): void }
export interface ArchiveAdapters {
  read(signal: AbortSignal): Promise<Uint8Array | null>;
  decode(bytes: Uint8Array, signal: AbortSignal): Promise<DecodedArchive>;
  createImage(entry: ArchiveEntry, signal: AbortSignal): Promise<ArchiveImageLease>;
  /** Atomic compare-and-swap: false means no mutation; a successful commit must not throw. */
  commit(candidate: ArchiveLibrary, expectedRevision: number): boolean;
  readImage(image: Readonly<ImageDocument>, signal: AbortSignal): Promise<Uint8Array>;
  encode(archive: DecodedArchive, signal: AbortSignal): Promise<Uint8Array>;
  write(bytes: Uint8Array, signal: AbortSignal): Promise<boolean>;
}
export interface ArchiveImportResult {
  readonly status: "committed" | "cancelled" | "conflict";
  readonly candidate: ArchiveLibrary | null; readonly remap: Readonly<Record<string, string>>;
  releaseImage(id: string): void;
  releaseAll(): void;
}
export const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const utf8 = new TextEncoder();
const validId = (s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= 256;
function metadata(value: { name: string; width: number; height: number; mimeType: string }): void {
  if (typeof value.name !== "string" || !value.name || value.name.length > 512
    || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(value.mimeType)
    || !Number.isSafeInteger(value.width) || value.width < 1 || value.width > 16_384
    || !Number.isSafeInteger(value.height) || value.height < 1 || value.height > 16_384
    || value.width * value.height > 16_777_216) throw new RangeError("Invalid archive image metadata");
}
function boundedJsonCloner(): (value: unknown) => ArchiveJson {
  let nodes = 0, bytes = 0;
  function clone(value: unknown, depth = 0): ArchiveJson {
    if (++nodes > 20_000 || depth > 32) throw new RangeError("Archive annotation structure exceeds bounds");
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      if (value.length > 4 * 1024 * 1024 || (bytes += utf8.encode(value).length) > 4 * 1024 * 1024) throw new RangeError("Archive annotations exceed byte budget");
      return value;
    }
    if (Array.isArray(value)) {
      if (value.length > 20_000) throw new RangeError("Archive annotations exceed count budget");
      return Object.freeze(value.map(v => clone(v, depth + 1)));
    }
    if (value && typeof value === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      const out: Record<string, ArchiveJson> = Object.create(null);
      for (const [key, child] of Object.entries(value)) {
        clone(key, depth + 1); out[key] = clone(child, depth + 1);
      }
      return Object.freeze(out);
    }
    throw new TypeError("Annotations must be bounded JSON data");
  }
  return clone;
}
function libraryCopy(input: ArchiveLibrary): ArchiveLibrary {
  if (!Number.isSafeInteger(input.revision) || input.revision < 0 || input.revision >= Number.MAX_SAFE_INTEGER
    || !Array.isArray(input.images) || input.images.length > 512) throw new RangeError("Invalid library snapshot");
  const ids = new Set<string>();
  const images = input.images.map(image => {
    metadata(image);
    if (!validId(image.id) || ids.has(image.id) || typeof image.src !== "string" || !image.src || image.src.length > 4096
      || !Number.isSafeInteger(image.byteSize) || image.byteSize < 1 || image.byteSize > 32 * 1024 * 1024) throw new RangeError("Invalid library image");
    ids.add(image.id);
    return Object.freeze({ id: image.id, name: image.name, src: image.src, width: image.width,
      height: image.height, byteSize: image.byteSize, mimeType: image.mimeType });
  });
  if (input.selectedId !== null && !ids.has(input.selectedId)) throw new RangeError("Selection is outside library");
  const clone = boundedJsonCloner(), annotations: Record<string, ArchiveJson> = Object.create(null);
  for (const [id, value] of Object.entries(input.annotations)) {
    if (!ids.has(id)) throw new RangeError("Annotation owner is outside library");
    annotations[id] = clone(value);
  }
  return Object.freeze({ revision: input.revision, images: Object.freeze(images), selectedId: input.selectedId, annotations: Object.freeze(annotations) });
}
function entriesCopy(input: DecodedArchive): DecodedArchive {
  if (!Array.isArray(input.entries) || input.entries.length > 256) throw new RangeError("Archive count budget exceeded");
  const ids = new Set<string>(), clone = boundedJsonCloner(); let bytes = 0, pixels = 0;
  const entries = input.entries.map(entry => {
    metadata(entry);
    if (!validId(entry.id) || ids.has(entry.id) || !(entry.bytes instanceof Uint8Array) || !entry.bytes.length
      || entry.bytes.length > 32 * 1024 * 1024) throw new RangeError("Invalid archive image data");
    ids.add(entry.id); bytes += entry.bytes.length; pixels += entry.width * entry.height;
    if (bytes > MAX_ARCHIVE_BYTES || pixels > 67_108_864) throw new RangeError("Archive aggregate budget exceeded");
    return Object.freeze({ id: entry.id, name: entry.name, width: entry.width, height: entry.height,
      mimeType: entry.mimeType, bytes: entry.bytes.slice(), annotations: clone(entry.annotations) });
  });
  if (input.selectedId !== null && !ids.has(input.selectedId)) throw new RangeError("Archive selection is outside entries");
  return Object.freeze({ entries: Object.freeze(entries), selectedId: input.selectedId });
}

/** Stages all imported resources before a single compare-and-swap; never owns old library URLs. */
export class ArchiveWorkflow {
  private active?: AbortController;
  constructor(private readonly adapters: ArchiveAdapters) {}
  cancel(): void { this.active?.abort(); }
  private begin(): AbortController {
    if (this.active) throw new Error("An archive job is still pending");
    const abort = new AbortController(); this.active = abort; return abort;
  }
  async importInto(input: ArchiveLibrary): Promise<ArchiveImportResult> {
    const original = libraryCopy(input), abort = this.begin(), leases = new Map<string, ArchiveImageLease>();
    const remap: Record<string, string> = Object.create(null);
    let committed = false;
    const release = (id: string) => { const lease = leases.get(id); leases.delete(id); if (lease) { try { lease.release(); } catch { /* Continue draining all other owned resources. */ } } };
    const releaseAll = () => { for (const id of [...leases.keys()]) release(id); };
    const result = (status: ArchiveImportResult["status"], candidate: ArchiveLibrary | null = null): ArchiveImportResult => Object.freeze({ status, candidate,
      remap: Object.freeze({ ...remap }), releaseImage: release, releaseAll });
    try {
      const encoded = await this.adapters.read(abort.signal);
      if (abort.signal.aborted || encoded === null) return result("cancelled");
      if (!(encoded instanceof Uint8Array) || !encoded.length || encoded.length > MAX_ARCHIVE_BYTES) throw new RangeError("Encoded archive exceeds bounds");
      const decoded = await this.adapters.decode(encoded.slice(), abort.signal);
      if (abort.signal.aborted) return result("cancelled");
      const archive = entriesCopy(decoded); // Validate the whole archive before creating any URL.
      if (archive.entries.length + original.images.length > 512) throw new RangeError("Merged library count budget exceeded");
      const images = [...original.images], annotations = { ...original.annotations };
      const existing = new Set(images.map(i => i.id)), reserved = new Set([...existing, ...archive.entries.map(i => i.id)]);
      for (const entry of archive.entries) {
        let id = entry.id;
        if (existing.has(id)) {
          let n = 1;
          do { id = `${entry.id.slice(0, 230)}~import-${n++}`; } while (reserved.has(id));
        }
        reserved.add(id); remap[entry.id] = id;
        const lease = await this.adapters.createImage(entry, abort.signal);
        if (!lease || typeof lease.release !== "function") throw new TypeError("Image adapter must transfer an owned lease");
        if ([...leases.values()].includes(lease)) throw new Error("Image adapter reused an owned lease");
        leases.set(id, lease);
        if (abort.signal.aborted) return result("cancelled");
        if (typeof lease.src !== "string" || !lease.src || lease.src.length > 4096) throw new RangeError("Invalid imported image locator");
        images.push(Object.freeze({ id, name: entry.name, src: lease.src, width: entry.width, height: entry.height,
          mimeType: entry.mimeType, byteSize: entry.bytes.length }));
        Object.defineProperty(annotations, id, { value: entry.annotations, enumerable: true, writable: true, configurable: true });
      }
      const candidate = Object.freeze({ revision: original.revision + 1, images: Object.freeze(images),
        selectedId: original.selectedId ?? (archive.selectedId === null ? null : remap[archive.selectedId] ?? null),
        annotations: Object.freeze(annotations) });
      if (abort.signal.aborted) return result("cancelled");
      if (!this.adapters.commit(candidate, original.revision)) return result("conflict");
      committed = true; return result("committed", candidate);
    } finally {
      if (!committed) releaseAll();
      if (this.active === abort) this.active = undefined;
    }
  }
  async exportFrom(input: ArchiveLibrary): Promise<"saved" | "cancelled"> {
    const snapshot = libraryCopy(input), abort = this.begin();
    try {
      const entries: ArchiveEntry[] = []; let bytes = 0;
      if (snapshot.images.length > 256) throw new RangeError("Archive count budget exceeded");
      for (const image of snapshot.images) {
        const data = await this.adapters.readImage(image, abort.signal);
        if (abort.signal.aborted) return "cancelled";
        if (!(data instanceof Uint8Array) || !data.length || data.length > 32 * 1024 * 1024 || (bytes += data.length) > MAX_ARCHIVE_BYTES) throw new RangeError("Archive image bytes exceed bounds");
        entries.push({ id: image.id, name: image.name, width: image.width, height: image.height, mimeType: image.mimeType,
          bytes: data.slice(), annotations: snapshot.annotations[image.id] ?? null }); // No source URL is serialized as image data.
      }
      const encoded = await this.adapters.encode(entriesCopy({ entries, selectedId: snapshot.selectedId }), abort.signal);
      if (abort.signal.aborted) return "cancelled";
      if (!(encoded instanceof Uint8Array) || !encoded.length || encoded.length > MAX_ARCHIVE_BYTES) throw new RangeError("Encoded archive exceeds bounds");
      return await this.adapters.write(encoded.slice(), abort.signal) ? "saved" : "cancelled";
    } finally { if (this.active === abort) this.active = undefined; }
  }
}
