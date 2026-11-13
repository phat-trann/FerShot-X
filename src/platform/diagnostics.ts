import { invoke, isTauri } from "@tauri-apps/api/core";
export type LogArea = "app" | "capture" | "image" | "clipboard" | "export" | "settings" | "ftp";
export type LogEvent = "started" | "completed" | "queued" | "failed" | "cancelled" | "recovered" | "unhandled";
export type LogCode = "none" | "busy" | "permission_denied" | "cancelled" | "invalid_input" | "capture_failed" | "clipboard_failed" | "settings_failed" | "ftp_failed" | "ftp_credentials" | "ftp_authentication" | "ftp_connection" | "ftp_timeout" | "ftp_tls" | "auto_scroll_failed" | "scroll_permission_denied" | "scroll_coordinates_missing" | "scroll_target_unavailable" | "scroll_no_movement" | "display_changed" | "other";
export interface LogEntry { id: number; timestamp: number; version?: string; area: LogArea; event: LogEvent; code: LogCode }
export interface DiagnosticReport { app: string; version: string; buildId?: string; platform: string; entries: readonly LogEntry[] }
const CODES: readonly string[] = ["none", "busy", "permission_denied", "cancelled", "invalid_input", "capture_failed", "clipboard_failed", "settings_failed", "ftp_failed", "ftp_credentials", "ftp_authentication", "ftp_connection", "ftp_timeout", "ftp_tls", "auto_scroll_failed", "scroll_permission_denied", "scroll_coordinates_missing", "scroll_target_unavailable", "scroll_no_movement", "display_changed", "other"];
/** Only enum metadata crosses the log boundary: never error.message, args, paths or image bytes. */
export function recordDiagnostic(area: LogArea, event: LogEvent, code: unknown = "none",technical?:{operation:string;durationMs?:number}): void {
  if (!isTauri() || (event !== "failed" && event !== "unhandled") || code === "cancelled") return;
  const safe: LogCode = typeof code === "string" && CODES.includes(code) ? code as LogCode : "other";
  const operations=["updater_check","updater_download","updater_install","updater_restart","updater_busy","updater_storage","read_capture_upload_mode","capture_image","capture_scroll_image","capture_repeat_area","copy_image","copy_text","copy_library_images","save_image","process_image","import_clipboard","library_image","library_thumbnail","edit_library_image","take_editor_image","fit_editor_window","show_editor","listen_editor_image","editor_image_decode","local_cache_save_draft","ftp_enqueue","ftp_start","ftp_remove","ftp_delete_remote","ftp_read_settings","ftp_save_settings","ftp_read_preview_auth","ftp_save_preview_auth","load_application_preferences","save_application_preferences","renderer_error","unhandled_rejection"];
  const details=technical?{operation:operations.includes(technical.operation)?technical.operation:"unknown",stage:"renderer_ipc",...(Number.isFinite(technical.durationMs)?{durationMs:Math.max(0,Math.min(600000,Math.round(technical.durationMs!)))}:{})}:{};
  void Promise.resolve().then(() => invoke("record_diagnostic", { input: { area, event, code: safe,...details } })).catch(() => {});
}
export function logNativeOperation(command: string, failed: boolean, code?: unknown,durationMs?:number): void {
  const area: LogArea = command==="read_capture_upload_mode"?"settings":command.startsWith("capture_") ? "capture" : command.includes("clipboard") || command.startsWith("copy_") ? "clipboard" : command === "save_image" ? "export" : command.includes("preferences") || command.includes("destination") || command.includes("shortcuts") ? "settings" : "image";
  if (failed) recordDiagnostic(area, code === "cancelled" ? "cancelled" : "failed", code,{operation:command,durationMs});
  else if (!command.startsWith("load_") && !command.startsWith("read_") && !command.startsWith("get_") && !command.startsWith("pending_") && command !== "repeat_area_available") recordDiagnostic(area, "completed");
}
async function call<T>(command: string): Promise<T> {
  if (!isTauri()) throw new Error("Diagnostic logs are available in the desktop app.");
  try { return await invoke<T>(command); } catch { throw new Error("Local logs are unavailable. Retry or clear the log history."); }
}
export const readDiagnostics = () => call<DiagnosticReport>("read_diagnostics");
export const clearDiagnostics = () => call<void>("clear_diagnostics");
export const exportDiagnostics = () => call<boolean>("export_diagnostics");
export async function listenDiagnostics(handler: () => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event"); return listen("fershot-diagnostics-updated", handler);
}

export interface LogPreferences { retentionDays: number }
export const readLogPreferences = () => call<LogPreferences>("read_log_preferences");
export const openLogsFolder = () => call<void>("open_logs_folder");
export async function saveLogPreferences(retentionDays: number): Promise<LogPreferences> {
 if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 90) throw new Error("Choose between 1 and 90 days.");
 try { return await invoke<LogPreferences>("save_log_preferences", {retentionDays}); } catch { throw new Error("Log retention could not be saved. Please retry."); }
}
