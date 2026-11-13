import type { ImageDocument } from "../contracts/media";

type Cached = { image: ImageDocument; blob: Blob; weight: number; expires: number };
/** Window-local LRU of encoded pixels. Each reader owns a separate, disposable URL. */
export function createPreviewCache({ maxEntries = 8, maxBytes = 64 * 1024 * 1024, ttl = 5 * 60_000 } = {}) {
  const entries = new Map<string, Cached>();
  const pending = new Map<string, Promise<Cached>>();
  let bytes = 0;
  const remove = (key: string) => { const entry = entries.get(key); if (entry) bytes -= entry.weight; entries.delete(key); };
  const copy = (entry: Cached): ImageDocument => ({ ...entry.image, src: URL.createObjectURL(entry.blob) });
  function get(key: string) {
    const entry = entries.get(key);
    if (!entry) return null;
    if (entry.expires <= Date.now()) { remove(key); return null; }
    entries.delete(key); entries.set(key, entry);
    return copy(entry);
  }
  async function load(key: string, read: () => Promise<ImageDocument>) {
    const cached = get(key); if (cached) return cached;
    let request = pending.get(key);
    if (!request) {
      request = Promise.resolve().then(async () => {
        const image = await read();
        try {
          // The native adapter returns a local Blob URL, never a remote URL.
          if (!image.src.startsWith("blob:")) throw new Error("Invalid preview source.");
          const response = await fetch(image.src);
          if (!response.ok) throw new Error("Preview data unavailable.");
          const blob = await response.blob();
          const entry = { image: { ...image, src: "" }, blob, weight: blob.size + image.width * image.height * 4, expires: Date.now() + ttl };
          if (pending.get(key) === request && entry.weight <= maxBytes) {
            for (const [id, value] of entries) if (value.expires <= Date.now()) remove(id);
            while (entries.size && (entries.size >= maxEntries || bytes + entry.weight > maxBytes)) remove(entries.keys().next().value!);
            if (maxEntries > 0) { remove(key); entries.set(key, entry); bytes += entry.weight; }
          }
          return entry;
        } finally { URL.revokeObjectURL(image.src); }
      }).finally(() => { if (pending.get(key) === request) pending.delete(key); });
      pending.set(key, request);
    }
    return copy(await request);
  }
  function retain(keys: ReadonlySet<string>) {
    for (const key of entries.keys()) if (!keys.has(key)) remove(key);
    for (const key of pending.keys()) if (!keys.has(key)) pending.delete(key);
  }
  function clear() { entries.clear(); pending.clear(); bytes = 0; }
  return { get, load, retain, clear };
}
