import {
  DEFAULT_APP_PREFERENCES,
  MAX_DEFAULT_ZOOM_PERCENT,
  MIN_DEFAULT_ZOOM_PERCENT,
  type FerShotAppPreferences,
  type PostCaptureBehavior,
} from "../app-preferences/AppPreferencesPanel";

const MAX_UTF8_BYTES = 16_384;
const utf8 = new TextEncoder();
const behaviors: readonly PostCaptureBehavior[] = [
  "open-editor",
  "show-preview",
  "copy-only",
  "save-only",
];
const preferenceKeys = [
  "postCaptureBehavior",
  "defaultZoomPercent",
  "keepEditorAlwaysOnTop",
  "showSystemNotifications",
  "launchAtLogin",
  "showInMenuBar",
  "baseSettings",
] as const;
const settingsKeys = [
  "saveFormat",
  "jpegQuality",
  "downscaleRetina",
  "showPreview",
] as const;

export interface AppPreferencesSidecarV1 {
  readonly version: 1;
  readonly preferences: FerShotAppPreferences;
}

function reject(message: string): never {
  throw new TypeError(message);
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    reject(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], name: string): void {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) reject(`${name} contains unknown field "${key}"`);
  }
  for (const key of keys) {
    if (!(key in value)) reject(`${name}.${key} is required`);
  }
}

function parseSettings(value: unknown): Readonly<FerShotAppPreferences["baseSettings"]> {
  const settings = record(value, "baseSettings");
  exactKeys(settings, settingsKeys, "baseSettings");
  if (settings.saveFormat !== "png" && settings.saveFormat !== "jpeg") {
    reject("baseSettings.saveFormat is invalid");
  }
  if (
    typeof settings.jpegQuality !== "number" ||
    !Number.isFinite(settings.jpegQuality) ||
    !Number.isInteger(settings.jpegQuality) ||
    settings.jpegQuality < 1 ||
    settings.jpegQuality > 100
  ) {
    reject("baseSettings.jpegQuality must be an integer between 1 and 100");
  }
  if (
    typeof settings.downscaleRetina !== "boolean" ||
    typeof settings.showPreview !== "boolean"
  ) {
    reject("baseSettings boolean fields must be booleans");
  }
  return Object.freeze({
    saveFormat: settings.saveFormat,
    jpegQuality: settings.jpegQuality,
    downscaleRetina: settings.downscaleRetina,
    showPreview: settings.showPreview,
  });
}

function parsePreferences(value: unknown): Readonly<FerShotAppPreferences> {
  const preferences = record(value, "preferences");
  exactKeys(preferences, preferenceKeys, "preferences");
  if (!behaviors.includes(preferences.postCaptureBehavior as PostCaptureBehavior)) {
    reject("preferences.postCaptureBehavior is invalid");
  }
  if (
    typeof preferences.defaultZoomPercent !== "number" ||
    !Number.isFinite(preferences.defaultZoomPercent) ||
    !Number.isInteger(preferences.defaultZoomPercent) ||
    preferences.defaultZoomPercent < MIN_DEFAULT_ZOOM_PERCENT ||
    preferences.defaultZoomPercent > MAX_DEFAULT_ZOOM_PERCENT
  ) {
    reject(`preferences.defaultZoomPercent must be an integer between ${MIN_DEFAULT_ZOOM_PERCENT} and ${MAX_DEFAULT_ZOOM_PERCENT}`);
  }
  for (const key of [
    "keepEditorAlwaysOnTop",
    "showSystemNotifications",
    "launchAtLogin",
    "showInMenuBar",
  ] as const) {
    if (typeof preferences[key] !== "boolean") {
      reject(`preferences.${key} must be a boolean`);
    }
  }
  return Object.freeze({
    postCaptureBehavior: preferences.postCaptureBehavior as PostCaptureBehavior,
    defaultZoomPercent: preferences.defaultZoomPercent as number,
    keepEditorAlwaysOnTop: preferences.keepEditorAlwaysOnTop as boolean,
    showSystemNotifications: preferences.showSystemNotifications as boolean,
    launchAtLogin: preferences.launchAtLogin as boolean,
    showInMenuBar: preferences.showInMenuBar as boolean,
    baseSettings: parseSettings(preferences.baseSettings),
  });
}

export function parseAppPreferencesJson(raw: string): Readonly<FerShotAppPreferences> {
  if (typeof raw !== "string" || utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(`App preferences exceed ${MAX_UTF8_BYTES} UTF-8 bytes`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new TypeError(
      `Invalid app preferences JSON: ${error instanceof Error ? error.message : "parse failure"}`,
    );
  }
  const envelope = record(parsed, "app preferences envelope");
  exactKeys(envelope, ["version", "preferences"], "app preferences envelope");
  if (envelope.version !== 1) throw new RangeError("Unsupported app preferences schema version");
  return parsePreferences(envelope.preferences);
}

export function serializeAppPreferencesJson(
  preferences: FerShotAppPreferences,
): string {
  const owned = parsePreferences(preferences);
  const raw = JSON.stringify({ version: 1, preferences: owned });
  if (utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(`App preferences exceed ${MAX_UTF8_BYTES} UTF-8 bytes`);
  }
  return raw;
}

export const DEFAULT_APP_PREFERENCES_SIDECAR: Readonly<FerShotAppPreferences> =
  Object.freeze({
    ...DEFAULT_APP_PREFERENCES,
    baseSettings: Object.freeze({ ...DEFAULT_APP_PREFERENCES.baseSettings }),
  });

export const APP_PREFERENCES_CODEC_LIMITS = Object.freeze({
  maxUtf8Bytes: MAX_UTF8_BYTES,
});
