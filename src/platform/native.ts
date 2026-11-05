import { invoke, isTauri } from "@tauri-apps/api/core";
export interface AppInfo { name: string; version: string; platform: string }
export async function readAppInfo(): Promise<AppInfo | null> {
  return isTauri() ? invoke<AppInfo>("app_info") : null;
}
