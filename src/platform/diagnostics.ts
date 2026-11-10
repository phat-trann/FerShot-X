import { invoke, isTauri } from "@tauri-apps/api/core";
export type LogArea = "app" | "capture" | "image" | "clipboard" | "export" | "settings" | "ftp";
export type LogEvent = "started" | "completed" | "queued" | "failed" | "cancelled" | "recovered" | "unhandled";
export type LogCode = "none" | "busy" | "permission_denied" | "cancelled" | "invalid_input" | "capture_failed" | "clipboard_failed" | "settings_failed" | "ftp_failed" | "ftp_credentials" | "ftp_authentication" | "ftp_connection" | "ftp_timeout" | "ftp_tls" | "other";
export interface LogEntry { id: number; timestamp: number; version?: string; area: LogArea; event: LogEvent; code: LogCode }
export interface DiagnosticReport { app: string; version: string; buildId?: string; platform: string; entries: readonly LogEntry[] }
const CODES: readonly string[] = ["none", "busy", "permission_denied", "cancelled", "invalid_input", "capture_failed", "clipboard_failed", "settings_failed", "ftp_failed", "ftp_credentials", "ftp_authentication", "ftp_connection", "ftp_timeout", "ftp_tls", "other"];
/** Only enum metadata crosses the log boundary: never error.message, args, paths or image bytes. */
export function recordDiagnostic(area: LogArea, event: LogEvent, code: unknown = "none"): void {
  if (!isTauri() || (event !== "failed" && event !== "unhandled") || code === "cancelled") return;
  const safe: LogCode = typeof code === "string" && CODES.includes(code) ? code as LogCode : "other";
  void Promise.resolve().then(() => invoke("record_diagnostic", { input: { area, event, code: safe } })).catch(() => {});
}
export function logNativeOperation(command: string, failed: boolean, code?: unknown): void {
  const area: LogArea = command.startsWith("capture_") ? "capture" : command.includes("clipboard") || command.startsWith("copy_") ? "clipboard" : command === "save_image" ? "export" : command.includes("preferences") || command.includes("destination") || command.includes("shortcuts") ? "settings" : "image";
  if (failed) recordDiagnostic(area, code === "cancelled" ? "cancelled" : "failed", code);
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
