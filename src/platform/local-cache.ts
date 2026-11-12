import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ImageDocument } from "../contracts/media";
import type { LocalDraft } from "../contracts/local-draft";
import type { LocalCacheEntry } from "../contracts/phase2";
import { rasterizeDocument } from "./native";

export type CachedLocalEntry = LocalCacheEntry;
export const localCacheAvailable = () => isTauri();
export async function listLocalCache(): Promise<readonly CachedLocalEntry[]> {
  const entries = await invoke<readonly CachedLocalEntry[]>("local_cache_list");
  if (!Array.isArray(entries)) throw new Error("Local history returned invalid metadata.");
  return entries;
}
export const removeLocalCache = (id: string) => invoke<boolean>("local_cache_remove", { id });
export async function saveLocalDraft(image:ImageDocument,draft:LocalDraft,writePixels:boolean):Promise<CachedLocalEntry>{
 const pngBase64=writePixels?await rasterizeDocument(image):null;
 return invoke<CachedLocalEntry>("local_cache_save_draft",{request:{id:image.localId??image.id,name:image.name,pngBase64,draft}});
}
