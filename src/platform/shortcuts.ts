import type { ShortcutBinding } from "../features/hotkey-panel";
import {
  GLOBAL_ACTIONS_V2,
  ACTION_LABELS_V2,
  type GlobalActionIdV2,
  type GlobalBindingsV2,
  emptyGlobalBindingsV2,
} from "../features/global-shortcuts-v2/types";
import {
  toNativeGlobalBindingsV2,
  parseGlobalShortcutsV2Json,
  serializeGlobalShortcutsV2Json,
} from "../features/global-shortcuts-v2/codec";
import {
  applyNativeShortcuts,
  readNativeShortcuts,
  readSavedNativeShortcuts,
  saveNativeShortcuts,
} from "./native";

export type HotkeyDraft = GlobalBindingsV2;
export const HOTKEY_ACTIONS: readonly GlobalActionIdV2[] = GLOBAL_ACTIONS_V2;
export const ACTION_LABELS = ACTION_LABELS_V2;

export function emptyHotkeys(): HotkeyDraft {
  return emptyGlobalBindingsV2();
}

export function shortcutStatus(value: unknown): { draft: HotkeyDraft; faulted: boolean } {
  if (!value || typeof value !== "object") throw new TypeError("Invalid native shortcut status.");
  const status = value as { bindings?: unknown; faulted?: unknown };
  if (
    typeof status.faulted !== "boolean" ||
    !status.bindings ||
    typeof status.bindings !== "object" ||
    Array.isArray(status.bindings)
  ) {
    throw new TypeError("Invalid shortcut state.");
  }
  const wire = status.bindings as Record<string, unknown>;
  const draft = { ...emptyGlobalBindingsV2() } as Record<GlobalActionIdV2, ShortcutBinding | null>;
  for (const action of GLOBAL_ACTIONS_V2) {
    if (!(action in wire)) {
      draft[action] = null;
      continue;
    }
    const raw = wire[action];
    if (raw === null || raw === undefined) {
      draft[action] = null;
      continue;
    }
    if (typeof raw !== "string" || raw.length > 128) throw new TypeError("Invalid shortcut accelerator.");
    const parts = raw.split("+");
    const code = parts.pop()!;
    if (parts.some((part) => !["Super", "Control", "Alt", "Shift"].includes(part))) {
      throw new TypeError("Unsupported shortcut modifier.");
    }
    const key = /^Key[A-Z]$/.test(code)
      ? code.slice(3).toLowerCase()
      : /^Digit[0-9]$/.test(code)
      ? code.slice(5)
      : code === "Space"
      ? " "
      : code;
    draft[action] = {
      key,
      metaKey: parts.includes("Super"),
      ctrlKey: parts.includes("Control"),
      altKey: parts.includes("Alt"),
      shiftKey: parts.includes("Shift"),
    };
  }
  const validated = parseGlobalShortcutsV2Json(serializeGlobalShortcutsV2Json(draft));
  return { draft: validated, faulted: status.faulted };
}

export async function readShortcuts() {
  return shortcutStatus(await readNativeShortcuts());
}

export async function readSavedShortcuts() {
  return shortcutStatus(await readSavedNativeShortcuts());
}

export async function saveShortcuts(draft: HotkeyDraft) {
  return shortcutStatus(await saveNativeShortcuts(toNativeGlobalBindingsV2(draft)));
}

export async function applyShortcuts(draft: HotkeyDraft) {
  return shortcutStatus(await applyNativeShortcuts(toNativeGlobalBindingsV2(draft)));
}
