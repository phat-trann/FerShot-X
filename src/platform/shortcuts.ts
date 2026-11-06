import { GLOBAL_HOTKEY_CONTRACT_PROPOSAL, type GlobalActionId, type ShortcutBinding } from "../features/hotkey-panel";
import { toNativeHotkeyBindings } from "../features/hotkey-wire-codec";
import { parseHotkeyPreferencesJson, serializeHotkeyPreferencesJson } from "../features/hotkey-preferences-codec";
import { applyNativeShortcuts, readNativeShortcuts, readSavedNativeShortcuts, saveNativeShortcuts } from "./native";

export type HotkeyDraft = Readonly<Record<GlobalActionId, ShortcutBinding | null>>;
export const HOTKEY_ACTIONS = GLOBAL_HOTKEY_CONTRACT_PROPOSAL.proposedActions;
export function emptyHotkeys(): HotkeyDraft { return Object.freeze(Object.fromEntries(HOTKEY_ACTIONS.map(action => [action, null]))) as HotkeyDraft; }
export function shortcutStatus(value: unknown): { draft: HotkeyDraft; faulted: boolean } {
  if (!value || typeof value !== "object") throw new TypeError("Invalid native shortcut status.");
  const status = value as { bindings?: unknown; faulted?: unknown };
  if (typeof status.faulted !== "boolean" || !status.bindings || typeof status.bindings !== "object" || Array.isArray(status.bindings)) throw new TypeError("Invalid shortcut state.");
  const wire = status.bindings as Record<string, unknown>;
  if (Object.keys(wire).length !== 5 || Object.keys(wire).some(action => !HOTKEY_ACTIONS.includes(action as GlobalActionId))) throw new TypeError("Invalid shortcut action map.");
  const draft = {} as Record<GlobalActionId, ShortcutBinding | null>;
  for (const action of HOTKEY_ACTIONS) {
    const raw = wire[action]; if (raw === null) { draft[action] = null; continue; }
    if (typeof raw !== "string" || raw.length > 128) throw new TypeError("Invalid shortcut accelerator.");
    const parts = raw.split("+"); const code = parts.pop()!;
    if (parts.some(part => !["Super", "Control", "Alt", "Shift"].includes(part))) throw new TypeError("Unsupported shortcut modifier.");
    const key = /^Key[A-Z]$/.test(code) ? code.slice(3).toLowerCase() : /^Digit[0-9]$/.test(code) ? code.slice(5) : code === "Space" ? " " : code;
    draft[action] = { key, metaKey: parts.includes("Super"), ctrlKey: parts.includes("Control"), altKey: parts.includes("Alt"), shiftKey: parts.includes("Shift") };
  }
  const validated = parseHotkeyPreferencesJson(serializeHotkeyPreferencesJson(draft));
  const canonical = toNativeHotkeyBindings(validated);
  if (HOTKEY_ACTIONS.some(action => canonical[action] !== wire[action])) throw new TypeError("Non-canonical native shortcut map.");
  return { draft: validated, faulted: status.faulted };
}
export async function readShortcuts() { return shortcutStatus(await readNativeShortcuts()); }
export async function readSavedShortcuts() { return shortcutStatus(await readSavedNativeShortcuts()); }
export async function saveShortcuts(draft: HotkeyDraft) { return shortcutStatus(await saveNativeShortcuts(toNativeHotkeyBindings(draft))); }
export async function applyShortcuts(draft: HotkeyDraft) { return shortcutStatus(await applyNativeShortcuts(toNativeHotkeyBindings(draft))); }
