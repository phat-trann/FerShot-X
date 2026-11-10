import { recordDiagnostic } from "./diagnostics";
import { invoke, isTauri } from "@tauri-apps/api/core";
import type { FtpQueueItem, FtpSettings } from "../contracts/phase2";
import type { ImageDocument } from "../contracts/media";
import { rasterizeDocument } from "./native";
async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error("FTP publishing requires the desktop app.");
  try { return await invoke<T>(command, args); }
  catch (error) { recordDiagnostic("ftp", "failed", typeof error === "object" && error && "code" in error ? error.code : "other",{operation:command}); throw new Error(typeof error === "object" && error && "message" in error ? String(error.message) : "FTP operation failed. Please retry."); }
}
export const readFtpSettings = () => call<FtpSettings | null>("ftp_read_settings");
export const saveFtpSettings = (settings: FtpSettings, password: string | null) => call<FtpSettings>("ftp_save_settings", { settings, password });
export const listFtpQueue = () => call<readonly FtpQueueItem[]>("ftp_list");
export const startFtpUpload = (id: string) => call<void>("ftp_start", { id });
export const removeFtpUpload = (id: string) => call<void>("ftp_remove", { id });
export const copyUploadUrl = (text: string) => call<void>("copy_text", { request: { text } });
export async function enqueueFtpUpload(sourceId: string, document: ImageDocument): Promise<FtpQueueItem> {
  return call<FtpQueueItem>("ftp_enqueue", { request: { sourceId, name: document.name, pngBase64: await rasterizeDocument(document) } });
}
export async function listenFtpQueue(handler: () => void, onError: (message: string) => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const queue = await listen("fershot-ftp-updated", handler);
  try { const error = await listen<string>("fershot-ftp-error", event => onError(event.payload)); return () => { queue(); error(); }; }
  catch (error) { queue(); throw error; }
}

export const deleteFtpRemote=(id:string)=>call<void>("ftp_delete_remote",{id,confirmed:true});

export interface PreviewAuth{origin:string;username:string;enabled:boolean}
export const readPreviewAuth=()=>call<PreviewAuth>("ftp_read_preview_auth");
export const savePreviewAuth=(settings:PreviewAuth,password:string|null)=>call<PreviewAuth>("ftp_save_preview_auth",{settings,password});

export const openFtpInBrowser=(id:string)=>call<void>("ftp_open_in_browser",{id});
