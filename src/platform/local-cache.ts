import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ImageDocument } from "../contracts/media";
import type { LocalDraft } from "../contracts/local-draft";
import type { LocalCacheEntry } from "../contracts/phase2";
import { documentFromPayload, rasterizeDocument, type ImagePayload } from "./native";

export type CachedLocalEntry = LocalCacheEntry;
export const localCacheAvailable = () => isTauri();
export async function listLocalCache(): Promise<readonly CachedLocalEntry[]> {
  const entries = await invoke<readonly CachedLocalEntry[]>("local_cache_list");
  if (!Array.isArray(entries)) throw new Error("Local history returned invalid metadata.");
  return entries;
}
export const removeLocalCache = (id: string) => invoke<boolean>("local_cache_remove", { id });
export async function storeLocalCache(image: ImageDocument): Promise<CachedLocalEntry> {
  const pngBase64 = await rasterizeDocument(image);
  return invoke<CachedLocalEntry>("local_cache_store", { request: { id: image.id, name: image.name, pngBase64 } });
}
export async function openLocalCache(entry: CachedLocalEntry): Promise<ImageDocument> {
  const payload = await invoke<ImagePayload>("local_cache_read", { id: entry.id });
  return { ...documentFromPayload(payload, entry.name), id: entry.id };
}
// A deliberately labelled placeholder: listing history never decodes all cached PNGs.
const CACHED_IMAGE_ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><rect width="120" height="80" rx="8" fill="#172338"/><path d="M43 45l12-12 9 8 7-6 10 15H39z" fill="#8cb4ef"/><text x="60" y="68" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#bdcce2">OPEN CACHED IMAGE</text></svg>')}`;
export function cachedLibraryDocument(entry: CachedLocalEntry): ImageDocument {
  return { id: entry.id, name: entry.name, width: entry.width, height: entry.height,
    byteSize: entry.byteSize, mimeType: "image/png", src: CACHED_IMAGE_ICON };
}

export async function saveLocalDraft(image:ImageDocument,draft:LocalDraft,writePixels:boolean):Promise<CachedLocalEntry>{
 const pngBase64=writePixels?await rasterizeDocument(image):null;
 return invoke<CachedLocalEntry>("local_cache_save_draft",{request:{id:image.localId??image.id,name:image.name,pngBase64,draft}});
}
