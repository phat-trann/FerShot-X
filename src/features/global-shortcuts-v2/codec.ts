import type { ShortcutBinding } from "../hotkey-panel/HotkeyPanel";
import {
  GLOBAL_ACTIONS_V2,
  emptyGlobalBindingsV2,
  type GlobalActionIdV2,
  type GlobalBindingsV2,
} from "./types";

const MAX_UTF8_BYTES = 16_384;
const utf8 = new TextEncoder();

const BINDING_KEYS = [
  "key",
  "metaKey",
  "shiftKey",
  "altKey",
  "ctrlKey",
] as const;

const RESERVED_MAC_SHORTCUTS: readonly ShortcutBinding[] = Object.freeze([
  Object.freeze({
    key: "q",
    metaKey: true,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
  }),
  Object.freeze({
    key: "w",
    metaKey: true,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
  }),
  Object.freeze({
    key: "tab",
    metaKey: true,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
  }),
  Object.freeze({
    key: " ",
    metaKey: true,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
  }),
]);

const NAMED_KEYS = [
  "Enter",
  "Escape",
  "Tab",
  "Space",
  "Backspace",
  "Delete",
  "Insert",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
] as const;

function reject(message: string): never {
  throw new TypeError(message);
}

function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    reject(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function bindingsEqual(
  a: ShortcutBinding | null,
  b: ShortcutBinding | null,
): boolean {
  if (!a || !b) {
    return a === b;
  }
  return (
    a.key.toLowerCase() === b.key.toLowerCase() &&
    Boolean(a.metaKey) === Boolean(b.metaKey) &&
    Boolean(a.shiftKey) === Boolean(b.shiftKey) &&
    Boolean(a.altKey) === Boolean(b.altKey) &&
    Boolean(a.ctrlKey) === Boolean(b.ctrlKey)
  );
}

function parseBinding(value: unknown, name: string): ShortcutBinding {
  const parsed = object(value, name);
  for (const key of BINDING_KEYS) {
    if (!(key in parsed)) {
      reject(`${name}.${key} is required`);
    }
  }
  for (const key of Object.keys(parsed)) {
    if (!BINDING_KEYS.includes(key as (typeof BINDING_KEYS)[number])) {
      reject(`${name} contains unknown field "${key}"`);
    }
  }
  if (
    typeof parsed.key !== "string" ||
    parsed.key.length < 1 ||
    parsed.key.length > 64 ||
    /[\u0000-\u001f\u007f]/.test(parsed.key)
  ) {
    reject(`${name}.key must be a bounded printable string`);
  }
  for (const key of ["metaKey", "shiftKey", "altKey", "ctrlKey"] as const) {
    if (typeof parsed[key] !== "boolean") {
      reject(`${name}.${key} must be a boolean`);
    }
  }

  const result: ShortcutBinding = Object.freeze({
    key: parsed.key,
    metaKey: parsed.metaKey as boolean,
    shiftKey: parsed.shiftKey as boolean,
    altKey: parsed.altKey as boolean,
    ctrlKey: parsed.ctrlKey as boolean,
  });

  if (!result.metaKey && !result.ctrlKey && !result.altKey) {
    reject(
      `${name} requires at least one modifier key (Cmd, Ctrl, or Alt) to avoid colliding with text input.`,
    );
  }

  for (const reserved of RESERVED_MAC_SHORTCUTS) {
    if (bindingsEqual(result, reserved)) {
      reject(`${name} collides with macOS system shortcut "${reserved.key}".`);
    }
  }

  return result;
}

function validateAndAssembleBindings(
  rawBindings: Record<string, unknown>,
  isV1: boolean,
): GlobalBindingsV2 {
  const result: Record<GlobalActionIdV2, ShortcutBinding | null> =
    { ...emptyGlobalBindingsV2() };
  if (isV1) {
    const legacy = ["capture-fullscreen", "capture-area", "capture-window", "capture-scrolling", "ocr-capture"];
    if (Object.keys(rawBindings).length !== legacy.length || legacy.some(action => !Object.prototype.hasOwnProperty.call(rawBindings, action))) {
      reject("Version 1 requires exactly its five supported actions.");
    }
  }

  // Validate allowed keys
  for (const key of Object.keys(rawBindings)) {
    if (!GLOBAL_ACTIONS_V2.includes(key as GlobalActionIdV2)) {
      // In v1, only 5 actions were known; any other action is rejected
      reject(`bindings contains unknown action "${key}"`);
    }
  }

  // Parse each action
  for (const action of GLOBAL_ACTIONS_V2) {
    if (action in rawBindings) {
      const val = rawBindings[action];
      result[action] = val === null ? null : parseBinding(val, `bindings.${action}`);
    } else {
      if (!isV1) {
        reject(`bindings.${action} is required`);
      }
      // If v1, missing action defaults to null
      result[action] = null;
    }
  }

  // Check duplicates among non-null bindings
  for (let i = 0; i < GLOBAL_ACTIONS_V2.length; i++) {
    const actionA = GLOBAL_ACTIONS_V2[i];
    const bindingA = result[actionA];
    if (!bindingA) continue;

    for (let j = i + 1; j < GLOBAL_ACTIONS_V2.length; j++) {
      const actionB = GLOBAL_ACTIONS_V2[j];
      const bindingB = result[actionB];
      if (!bindingB) continue;

      if (bindingsEqual(bindingA, bindingB)) {
        reject(
          `Duplicate shortcut conflict between "${actionA}" and "${actionB}".`,
        );
      }
    }
  }

  return Object.freeze(result);
}

export function parseGlobalShortcutsV2Json(raw: string): GlobalBindingsV2 {
  if (typeof raw !== "string" || utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(
      `Global shortcuts exceed ${MAX_UTF8_BYTES} UTF-8 bytes`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new TypeError(
      `Invalid global shortcuts JSON: ${error instanceof Error ? error.message : "parse failure"}`,
    );
  }

  const envelope = object(parsed, "global shortcuts envelope");
  for (const key of Object.keys(envelope)) {
    if (key !== "version" && key !== "bindings") {
      reject(`global shortcuts envelope contains unknown field "${key}"`);
    }
  }

  const version = envelope.version;
  if (version !== 1 && version !== 2) {
    throw new RangeError(`Unsupported global shortcuts schema version: ${version}`);
  }

  const bindingsObj = object(envelope.bindings, "bindings");
  return validateAndAssembleBindings(bindingsObj, version === 1);
}

export function serializeGlobalShortcutsV2Json(
  bindings: GlobalBindingsV2,
): string {
  const validated = validateAndAssembleBindings(
    bindings as unknown as Record<string, unknown>,
    false,
  );
  const raw = JSON.stringify({ version: 2, bindings: validated });
  if (utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(
      `Global shortcuts exceed ${MAX_UTF8_BYTES} UTF-8 bytes`,
    );
  }
  return raw;
}

function nativeKeyCode(key: string): string {
  if (/^[A-Za-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  if (/^F(?:[1-9]|1[0-9]|2[0-4])$/i.test(key)) return key.toUpperCase();
  if (key === " ") return "Space";
  const named = NAMED_KEYS.find(
    (value) => value.toLowerCase() === key.toLowerCase(),
  );
  if (named) return named;
  throw new RangeError(`Unsupported native shortcut key: ${JSON.stringify(key)}`);
}

export function toNativeGlobalBindingsV2(
  input: GlobalBindingsV2,
): Readonly<Record<GlobalActionIdV2, string | null>> {
  const validated = parseGlobalShortcutsV2Json(
    serializeGlobalShortcutsV2Json(input),
  );
  const result = {} as Record<GlobalActionIdV2, string | null>;
  const accelerators = new Set<string>();

  for (const action of GLOBAL_ACTIONS_V2) {
    const binding = validated[action];
    if (binding === null) {
      result[action] = null;
      continue;
    }
    const code = nativeKeyCode(binding.key);
    const modifiers: string[] = [];
    if (binding.metaKey) modifiers.push("Super");
    if (binding.ctrlKey) modifiers.push("Control");
    if (binding.altKey) modifiers.push("Alt");
    if (binding.shiftKey) modifiers.push("Shift");
    const accelerator = [...modifiers, code].join("+");
    if (["KeyQ", "KeyW", "Tab", "Space"].includes(code) && modifiers.length === 1 && modifiers[0] === "Super") {
      throw new TypeError("Reserved macOS shortcut accelerator.");
    }
    if (accelerators.has(accelerator)) throw new TypeError("Duplicate native shortcut accelerator.");
    accelerators.add(accelerator);
    result[action] = accelerator;
  }

  return Object.freeze(result);
}

