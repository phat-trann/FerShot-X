import {
  bindingsEqual,
  validateShortcutCandidate,
  type GlobalActionId,
  type HotkeyItem,
  type ShortcutBinding,
} from "../hotkey-panel/HotkeyPanel";

const MAX_UTF8_BYTES = 16_384;
const utf8 = new TextEncoder();
const ACTIONS: readonly GlobalActionId[] = [
  "capture-fullscreen",
  "capture-area",
  "capture-window",
  "capture-scrolling",
  "ocr-capture",
];
const BINDING_KEYS = ["key", "metaKey", "shiftKey", "altKey", "ctrlKey"] as const;

export interface HotkeyPreferencesSidecarV1 {
  readonly version: 1;
  readonly bindings: Readonly<Record<GlobalActionId, ShortcutBinding | null>>;
}

function reject(message: string): never {
  throw new TypeError(message);
}

function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    reject(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function binding(value: unknown, name: string): ShortcutBinding {
  const parsed = object(value, name);
  for (const key of BINDING_KEYS) {
    if (!(key in parsed)) reject(`${name}.${key} is required`);
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
    if (typeof parsed[key] !== "boolean") reject(`${name}.${key} must be a boolean`);
  }
  const metaKey = parsed.metaKey as boolean;
  const shiftKey = parsed.shiftKey as boolean;
  const altKey = parsed.altKey as boolean;
  const ctrlKey = parsed.ctrlKey as boolean;
  return Object.freeze({
    key: parsed.key,
    metaKey,
    shiftKey,
    altKey,
    ctrlKey,
  });
}

function validateBindings(
  input: Record<string, unknown>,
): Readonly<Record<GlobalActionId, ShortcutBinding | null>> {
  for (const key of Object.keys(input)) {
    if (!ACTIONS.includes(key as GlobalActionId)) {
      reject(`bindings contains unknown action "${key}"`);
    }
  }
  for (const action of ACTIONS) {
    if (!(action in input)) reject(`bindings.${action} is required`);
  }
  const items: HotkeyItem[] = ACTIONS.map((actionId) => ({
    actionId,
    label: actionId,
    binding: null,
  }));
  const result = {} as Record<GlobalActionId, ShortcutBinding | null>;
  for (const actionId of ACTIONS) {
    const candidate = input[actionId] === null ? null : binding(input[actionId], `bindings.${actionId}`);
    if (candidate) {
      const validation = validateShortcutCandidate(candidate, actionId, items);
      if (!validation.valid) {
        reject(validation.message ?? `Invalid shortcut for ${actionId}`);
      }
    }
    result[actionId] = candidate;
    const itemIndex = items.findIndex((entry) => entry.actionId === actionId);
    if (itemIndex >= 0) {
      items[itemIndex] = { ...items[itemIndex], binding: candidate };
    }
  }
  return Object.freeze(result);
}

export function parseHotkeyPreferencesJson(
  raw: string,
): Readonly<Record<GlobalActionId, ShortcutBinding | null>> {
  if (typeof raw !== "string" || utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(`Hotkey preferences exceed ${MAX_UTF8_BYTES} UTF-8 bytes`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new TypeError(
      `Invalid hotkey preferences JSON: ${error instanceof Error ? error.message : "parse failure"}`,
    );
  }
  const envelope = object(parsed, "hotkey preferences envelope");
  if (Object.keys(envelope).some((key) => key !== "version" && key !== "bindings")) {
    reject("hotkey preferences envelope contains unknown fields");
  }
  if (envelope.version !== 1) throw new RangeError("Unsupported hotkey preferences schema version");
  return validateBindings(object(envelope.bindings, "bindings"));
}

export function serializeHotkeyPreferencesJson(
  bindings: Readonly<Record<GlobalActionId, ShortcutBinding | null>>,
): string {
  const owned = validateBindings(bindings as unknown as Record<string, unknown>);
  const raw = JSON.stringify({ version: 1, bindings: owned });
  if (utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(`Hotkey preferences exceed ${MAX_UTF8_BYTES} UTF-8 bytes`);
  }
  return raw;
}

export { bindingsEqual };

export const HOTKEY_PREFERENCES_CODEC_LIMITS = Object.freeze({
  maxUtf8Bytes: MAX_UTF8_BYTES,
  maxKeyLength: 64,
});
