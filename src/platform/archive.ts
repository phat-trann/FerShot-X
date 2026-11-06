import { ArchiveWorkflow, MAX_ARCHIVE_BYTES, type ArchiveEntry, type ArchiveJson, type ArchiveLibrary, type DecodedArchive } from "../features/archive-workflow";
import { decodeEditorSession } from "../features/editor-session-codec";
import { createEditorState } from "../features/editor/model";
import { assertImageDimensions, MAX_NATIVE_BYTES } from "./image-limits";
import { readLocalArchive, writeLocalArchive } from "./native";

const utf8 = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
function abort(signal: AbortSignal) { if (signal.aborted) throw new DOMException("Archive cancelled.", "AbortError"); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid archive record.");
  return value as Record<string, unknown>;
}
function keys(record: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(record).some(key => !allowed.includes(key)) || allowed.some(key => !Object.prototype.hasOwnProperty.call(record, key))) throw new TypeError("Invalid archive fields.");
}
function base64(bytes: Uint8Array): string {
  let result = "";
  for (let index = 0; index < bytes.length; index += 8192) result += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(result);
}
function annotations(value: ArchiveJson, width: number, height: number): ArchiveJson {
  const session = decodeEditorSession(JSON.stringify(value), width, height);
  // Persisted data must also satisfy the live editor's stricter consumer contract.
  createEditorState({ annotations: session.basic, historyLimit: 0 });
  for (const item of session.advanced) {
    if (item.itemKind === "contract") createEditorState({ annotations: [item.annotation], historyLimit: 0 });
  }
  return JSON.parse(JSON.stringify(session)) as ArchiveJson;
}

export function encodeLocalArchive(archive: DecodedArchive): Uint8Array {
  if (archive.entries.length > 64) throw new RangeError("Archive is limited to 64 images.");
  const raw = JSON.stringify({ format: "ferby-session", version: 1, selectedId: archive.selectedId,
    entries: archive.entries.map(entry => ({ id: entry.id, name: entry.name, width: entry.width, height: entry.height,
      mimeType: entry.mimeType, bytesBase64: base64(entry.bytes), annotations: annotations(entry.annotations, entry.width, entry.height) })) });
  const bytes = utf8.encode(raw);
  if (!bytes.length || bytes.length > MAX_ARCHIVE_BYTES) throw new RangeError("Encoded archive exceeds 64 MiB including base64 and annotations.");
  return bytes;
}

export function decodeLocalArchive(bytes: Uint8Array): DecodedArchive {
  if (!bytes.length || bytes.length > MAX_ARCHIVE_BYTES) throw new RangeError("Archive exceeds 64 MiB.");
  const envelope = object(JSON.parse(decoder.decode(bytes)));
  keys(envelope, ["format", "version", "selectedId", "entries"]);
  if (envelope.format !== "ferby-session" || envelope.version !== 1 || !Array.isArray(envelope.entries) || envelope.entries.length > 64) throw new TypeError("Unsupported Ferby archive.");
  if (envelope.selectedId !== null && typeof envelope.selectedId !== "string") throw new TypeError("Invalid archive selection.");
  const entries: ArchiveEntry[] = envelope.entries.map(value => {
    const entry = object(value); keys(entry, ["id", "name", "width", "height", "mimeType", "bytesBase64", "annotations"]);
    if (typeof entry.id !== "string" || !/^[A-Za-z0-9_~\-]{1,256}$/.test(entry.id) || typeof entry.name !== "string" || !entry.name || entry.name.length > 512
        || typeof entry.mimeType !== "string" || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(entry.mimeType)
        || typeof entry.width !== "number" || typeof entry.height !== "number"
        || typeof entry.bytesBase64 !== "string" || entry.bytesBase64.length > Math.ceil(MAX_NATIVE_BYTES / 3) * 4) throw new TypeError("Invalid archive entry.");
    assertImageDimensions(entry.width, entry.height);
    const decoded = Uint8Array.from(atob(entry.bytesBase64), character => character.charCodeAt(0));
    if (!decoded.length || decoded.length > MAX_NATIVE_BYTES) throw new RangeError("Archive image exceeds 32 MiB.");
    return { id: entry.id, name: entry.name, width: entry.width, height: entry.height,
      mimeType: entry.mimeType, bytes: decoded, annotations: annotations(entry.annotations as ArchiveJson, entry.width, entry.height) };
  });
  const ids = new Set(entries.map(entry => entry.id));
  if (ids.size !== entries.length || (envelope.selectedId !== null && !ids.has(envelope.selectedId as string))) throw new TypeError("Duplicate entry or invalid archive selection.");
  return { entries, selectedId: envelope.selectedId as string | null };
}

export function createLocalArchiveWorkflow(commit: (candidate: ArchiveLibrary, expectedRevision: number) => boolean): ArchiveWorkflow {
  return new ArchiveWorkflow({
    read: async signal => { abort(signal); const raw = await readLocalArchive(); abort(signal); return raw === null ? null : utf8.encode(raw); },
    decode: async (bytes, signal) => { abort(signal); return decodeLocalArchive(bytes); },
    encode: async (archive, signal) => { abort(signal); return encodeLocalArchive(archive); },
    write: async (bytes, signal) => { abort(signal); return writeLocalArchive(decoder.decode(bytes)); },
    createImage: async (entry, signal) => {
      abort(signal);
      const data = new Uint8Array(entry.bytes);
      const src = URL.createObjectURL(new Blob([data], { type: entry.mimeType }));
      try {
        const image = new Image(); image.src = src; await image.decode();
        if (image.naturalWidth !== entry.width || image.naturalHeight !== entry.height) throw new RangeError("Archive raster metadata does not match decoded pixels.");
        return { src, release: () => URL.revokeObjectURL(src) };
      } catch (reason) { URL.revokeObjectURL(src); throw reason; }
    },
    readImage: async (image, signal) => {
      abort(signal);
      if (!image.src.startsWith("blob:")) throw new TypeError("Archive source must be an owned local image.");
      const response = await fetch(image.src, { signal });
      const blob = await response.blob();
      if (!response.ok || !blob.size || blob.size > MAX_NATIVE_BYTES || blob.size !== image.byteSize) throw new RangeError("Archive source bytes changed or exceed bounds.");
      return new Uint8Array(await blob.arrayBuffer());
    },
    commit,
  });
}
