import { invoke, isTauri } from "@tauri-apps/api/core";

export async function openPreferencesWindow(tab?: "general" | "hotkeys" | "uploading" | "advanced" | "updates"): Promise<void> {
  if (isTauri()) { await invoke("open_preferences_window", tab ? { tab } : {}); return; }
  const popup = window.open(`?preferences${tab ? `&tab=${tab}` : ""}`, "fershot-preferences", "popup,width=760,height=700");
  if (!popup) throw new Error("Allow the Settings window to open, then retry.");
  popup.focus();
}
export async function closePreferencesWindow(): Promise<void> {
  if (isTauri()) await invoke("close_preferences_window"); else window.close();
}
export async function listenPreferencesChanged(handler: () => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  return listen("fershot-preferences-updated", handler);
}
