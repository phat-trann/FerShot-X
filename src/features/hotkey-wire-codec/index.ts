import { parseHotkeyPreferencesJson, serializeHotkeyPreferencesJson } from "../hotkey-preferences-codec/codec";
import { GLOBAL_HOTKEY_CONTRACT_PROPOSAL, type GlobalActionId, type ShortcutBinding } from "../hotkey-panel/HotkeyPanel";

export type NativeHotkeyBindings = Readonly<Record<GlobalActionId, string | null>>;
const actions = GLOBAL_HOTKEY_CONTRACT_PROPOSAL.proposedActions;
const namedKeys = ["Enter", "Escape", "Tab", "Space", "Backspace", "Delete", "Insert", "Home", "End", "PageUp", "PageDown", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"] as const;

function keyCode(key: string): string {
  if (/^[A-Za-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  if (/^F(?:[1-9]|1[0-9]|2[0-4])$/i.test(key)) return key.toUpperCase();
  if (key === " ") return "Space";
  const named = namedKeys.find(value => value.toLowerCase() === key.toLowerCase());
  if (named) return named;
  throw new RangeError(`Unsupported native shortcut key: ${JSON.stringify(key)}`);
}

/** Pure Ferby subset adapter; root owns registration and native parsing. */
export function toNativeHotkeyBindings(input: Readonly<Record<GlobalActionId, ShortcutBinding | null>>): NativeHotkeyBindings {
  const validated = parseHotkeyPreferencesJson(serializeHotkeyPreferencesJson(input));
  const result = {} as Record<GlobalActionId, string | null>;
  const canonical = {} as Record<GlobalActionId, ShortcutBinding | null>;
  for (const action of actions) {
    const binding = validated[action];
    if (binding === null) { result[action] = null; canonical[action] = null; continue; }
    const code = keyCode(binding.key);
    const modifiers: string[] = [];
    if (binding.metaKey) modifiers.push("Super");
    if (binding.ctrlKey) modifiers.push("Control");
    if (binding.altKey) modifiers.push("Alt");
    if (binding.shiftKey) modifiers.push("Shift");
    result[action] = [...modifiers, code].join("+");
    // Explicit supported aliases must still share reserved-key and duplicate checks.
    const key = code === "Space" ? " " : code.startsWith("Key") ? code.slice(3).toLowerCase() : code.startsWith("Digit") ? code.slice(5) : code;
    canonical[action] = { ...binding, key };
  }
  parseHotkeyPreferencesJson(serializeHotkeyPreferencesJson(canonical));
  return Object.freeze(result);
}
