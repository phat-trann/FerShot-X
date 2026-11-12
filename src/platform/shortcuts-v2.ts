import {invoke} from "@tauri-apps/api/core";
import { GLOBAL_ACTIONS_V2, emptyGlobalBindingsV2, parseGlobalShortcutsV2Json, serializeGlobalShortcutsV2Json, toNativeGlobalBindingsV2, type GlobalBindingsV2 } from "../features/global-shortcuts-v2";
import { applyNativeShortcuts, readNativeShortcuts, readSavedNativeShortcuts, saveNativeShortcuts } from "./native";

export type HotkeyDraft = GlobalBindingsV2;
export const HOTKEY_ACTIONS = GLOBAL_ACTIONS_V2;
export const emptyHotkeys = emptyGlobalBindingsV2;
const LEGACY_ACTIONS = ["capture-fullscreen", "capture-area", "capture-window", "capture-scrolling", "ocr-capture"];

/** Read the actual eight-action native map; accept an exact v1 map only for migration. */
export function shortcutStatus(value: unknown): { draft: HotkeyDraft; faulted: boolean; restorationFailed?: boolean } {
  if (!value || typeof value !== "object") throw new TypeError("Invalid native shortcut status.");
  const status = value as { bindings?: unknown; faulted?: unknown; restorationFailed?:unknown };
  if (typeof status.faulted !== "boolean" || !status.bindings || typeof status.bindings !== "object" || Array.isArray(status.bindings)) throw new TypeError("Invalid shortcut state.");
  const wire = status.bindings as Record<string, unknown>;
  const keys = Object.keys(wire);
  const legacy = keys.length === LEGACY_ACTIONS.length && LEGACY_ACTIONS.every(action => Object.prototype.hasOwnProperty.call(wire, action));
  if (!legacy && (keys.length !== HOTKEY_ACTIONS.length || keys.some(action => !HOTKEY_ACTIONS.includes(action as typeof HOTKEY_ACTIONS[number])))) throw new TypeError("Invalid shortcut action map.");
  const draft: Record<string, unknown> = { ...emptyHotkeys() };
  for (const action of HOTKEY_ACTIONS) {
    if (legacy && !LEGACY_ACTIONS.includes(action)) continue;
    const raw = wire[action]; if (raw === null) continue;
    if (typeof raw !== "string" || !raw || raw.length > 128) throw new TypeError("Invalid shortcut accelerator.");
    const parts = raw.split("+"); const code = parts.pop()!;
    if (parts.some(part => !["Super", "Control", "Alt", "Shift"].includes(part))) throw new TypeError("Unsupported shortcut modifier.");
    const key = /^Key[A-Z]$/.test(code) ? code.slice(3).toLowerCase() : /^Digit[0-9]$/.test(code) ? code.slice(5) : code === "Space" ? " " : code;
    draft[action] = { key, metaKey: parts.includes("Super"), ctrlKey: parts.includes("Control"), altKey: parts.includes("Alt"), shiftKey: parts.includes("Shift") };
  }
  const validated = parseGlobalShortcutsV2Json(JSON.stringify({ version: 2, bindings: draft }));
  const canonical = toNativeGlobalBindingsV2(validated);
  if (keys.some(action => canonical[action as typeof HOTKEY_ACTIONS[number]] !== wire[action])) throw new TypeError("Non-canonical native shortcut map.");
  return { draft: validated, faulted: status.faulted, ...(status.restorationFailed===true?{restorationFailed:true}:{}) };
}
export async function readShortcuts() { return shortcutStatus(await readNativeShortcuts()); }
export async function readSavedShortcuts() { return shortcutStatus(await readSavedNativeShortcuts()); }
export async function saveShortcuts(draft: HotkeyDraft) {
  serializeGlobalShortcutsV2Json(draft);
  return shortcutStatus(await saveNativeShortcuts(toNativeGlobalBindingsV2(draft)));
}
export async function applyShortcuts(draft: HotkeyDraft) { return shortcutStatus(await applyNativeShortcuts(toNativeGlobalBindingsV2(draft))); }

export async function configureShortcuts(draft:HotkeyDraft){serializeGlobalShortcutsV2Json(draft);try{return shortcutStatus(await invoke("configure_shortcuts",{bindings:toNativeGlobalBindingsV2(draft)}));}catch(error){const code=(error as {code?:string})?.code;throw new Error(code==="shortcut_conflict"?"A shortcut is already in use. Choose another key combination.":code==="shortcut_cleanup"?"Remove shortcuts to finish cleanup, then install again.":"Shortcuts could not be installed or saved. Previous assignments were preserved where possible.");}}
