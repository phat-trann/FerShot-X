import type { AppSettings } from "../../contracts/settings";
import {
  DEFAULT_POST_CAPTURE_PREFERENCES,
  type PostCapturePreferences,
} from "../post-capture/PostCapturePlanner";

const MAX_UTF8_BYTES = 16_384;
const utf8 = new TextEncoder();
const KEYS: readonly (keyof PostCapturePreferences)[] = [
  "copyToClipboard",
  "autoSave",
  "showPreview",
  "openInEditor",
  "revealWindow",
];

export type CapturePreferenceOverrides = Partial<
  Pick<PostCapturePreferences, "showPreview">
>;

function invalid(message: string): never {
  throw new TypeError(message);
}

function ownedPreferences(
  value: Record<keyof PostCapturePreferences, unknown>,
): Readonly<PostCapturePreferences> {
  for (const key of KEYS) {
    if (typeof value[key] !== "boolean") {
      invalid(`postCapture.${key} must be a boolean`);
    }
  }
  return Object.freeze({
    copyToClipboard: value.copyToClipboard as boolean,
    autoSave: value.autoSave as boolean,
    showPreview: value.showPreview as boolean,
    openInEditor: value.openInEditor as boolean,
    revealWindow: value.revealWindow as boolean,
  });
}

function parseObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid("Capture preferences must be an object");
  }
  return value as Record<string, unknown>;
}

export function parseCapturePreferencesJson(
  raw: string,
): Readonly<PostCapturePreferences> {
  if (typeof raw !== "string" || utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(`Capture preferences exceed ${MAX_UTF8_BYTES} UTF-8 bytes`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new TypeError(
      `Invalid capture preferences JSON: ${
        error instanceof Error ? error.message : "parse failure"
      }`,
    );
  }
  const envelope = parseObject(parsed);
  if (envelope.version !== 1) {
    throw new RangeError("Unsupported capture preferences schema version");
  }
  const postCapture = parseObject(envelope.postCapture);
  return ownedPreferences(postCapture as Record<keyof PostCapturePreferences, unknown>);
}

export function serializeCapturePreferencesJson(
  preferences: PostCapturePreferences,
): string {
  const postCapture = ownedPreferences(
    preferences as unknown as Record<keyof PostCapturePreferences, unknown>,
  );
  const raw = JSON.stringify({ version: 1, postCapture });
  if (utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(`Capture preferences exceed ${MAX_UTF8_BYTES} UTF-8 bytes`);
  }
  return raw;
}

export function capturePreferencesFromSettings(
  settings: AppSettings,
  overrides: CapturePreferenceOverrides = {},
): Readonly<PostCapturePreferences> {
  if (typeof settings?.showPreview !== "boolean") {
    invalid("settings.showPreview must be a boolean");
  }
  if (
    overrides.showPreview !== undefined &&
    typeof overrides.showPreview !== "boolean"
  ) {
    invalid("overrides.showPreview must be a boolean");
  }
  return Object.freeze({
    ...DEFAULT_POST_CAPTURE_PREFERENCES,
    showPreview:
      overrides.showPreview !== undefined
        ? overrides.showPreview
        : settings.showPreview,
  });
}

export const CAPTURE_PREFERENCES_CODEC_LIMITS = Object.freeze({
  maxUtf8Bytes: MAX_UTF8_BYTES,
});
