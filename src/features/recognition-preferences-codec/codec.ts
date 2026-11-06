import { validateOcrLanguages } from "../ocr-languages";

const MAX_UTF8_BYTES = 16_384;
const MAX_LANGUAGES = 16;
const utf8 = new TextEncoder();

export type RecognitionMode = "ocr" | "qr" | "both";

export interface RecognitionPreferences {
  readonly mode: RecognitionMode;
  readonly languages: readonly string[];
  readonly preserveLineBreaks: boolean;
}

export interface RecognitionPreferencesSidecarV1 {
  readonly version: 1;
  readonly recognition: RecognitionPreferences;
}

const RECOGNITION_KEYS = [
  "mode",
  "languages",
  "preserveLineBreaks",
] as const;

const ENVELOPE_KEYS = ["version", "recognition"] as const;

function reject(message: string): never {
  throw new TypeError(message);
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    reject(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  name: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      reject(`${name} contains unknown field "${key}"`);
    }
  }
  for (const key of allowed) {
    if (!(key in value)) {
      reject(`${name}.${key} is required`);
    }
  }
}

export function parseRecognitionPreferences(
  value: unknown,
  supportedLanguages?: readonly string[],
): Readonly<RecognitionPreferences> {
  const obj = record(value, "recognition");
  exactKeys(obj, RECOGNITION_KEYS, "recognition");

  if (typeof obj.mode !== "string") {
    reject("recognition.mode must be a string");
  }
  if (obj.mode !== "ocr" && obj.mode !== "qr" && obj.mode !== "both") {
    reject('recognition.mode must be "ocr", "qr", or "both"');
  }
  const mode = obj.mode as RecognitionMode;

  if (!Array.isArray(obj.languages)) {
    reject("recognition.languages must be an array");
  }
  if (obj.languages.length > MAX_LANGUAGES) {
    throw new RangeError(
      `recognition.languages exceeds maximum limit of ${MAX_LANGUAGES} tags`,
    );
  }
  for (const item of obj.languages) {
    if (typeof item !== "string") {
      reject("recognition.languages elements must be strings");
    }
  }

  const rawTags = obj.languages as readonly string[];
  const validatedLanguages = validateOcrLanguages(
    rawTags,
    supportedLanguages ?? rawTags,
  );
  if (validatedLanguages.length > MAX_LANGUAGES) {
    throw new RangeError(
      `recognition.languages exceeds maximum limit of ${MAX_LANGUAGES} tags`,
    );
  }

  if (typeof obj.preserveLineBreaks !== "boolean") {
    reject("recognition.preserveLineBreaks must be a boolean");
  }
  const preserveLineBreaks = obj.preserveLineBreaks;

  return Object.freeze({
    mode,
    languages: Object.freeze(validatedLanguages),
    preserveLineBreaks,
  });
}

export function parseRecognitionPreferencesJson(
  raw: string,
  supportedLanguages?: readonly string[],
): Readonly<RecognitionPreferences> {
  if (typeof raw !== "string" || utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(
      `Recognition preferences exceed ${MAX_UTF8_BYTES} UTF-8 bytes`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new TypeError(
      `Invalid recognition preferences JSON: ${
        error instanceof Error ? error.message : "parse failure"
      }`,
    );
  }
  const envelope = record(parsed, "recognition preferences envelope");
  exactKeys(envelope, ENVELOPE_KEYS, "recognition preferences envelope");
  if (envelope.version !== 1) {
    throw new RangeError(
      "Unsupported recognition preferences schema version",
    );
  }
  return parseRecognitionPreferences(envelope.recognition, supportedLanguages);
}

export function serializeRecognitionPreferencesJson(
  preferences: RecognitionPreferences,
  supportedLanguages?: readonly string[],
): string {
  const owned = parseRecognitionPreferences(preferences, supportedLanguages);
  const raw = JSON.stringify({ version: 1, recognition: owned });
  if (utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(
      `Recognition preferences exceed ${MAX_UTF8_BYTES} UTF-8 bytes`,
    );
  }
  return raw;
}

export const DEFAULT_RECOGNITION_PREFERENCES: Readonly<RecognitionPreferences> =
  Object.freeze({
    mode: "both" as const,
    languages: Object.freeze(["en-us"]),
    preserveLineBreaks: true,
  });

export const DEFAULT_RECOGNITION_PREFERENCES_SIDECAR: Readonly<RecognitionPreferencesSidecarV1> =
  Object.freeze({
    version: 1 as const,
    recognition: DEFAULT_RECOGNITION_PREFERENCES,
  });

export const RECOGNITION_PREFERENCES_CODEC_LIMITS = Object.freeze({
  maxUtf8Bytes: MAX_UTF8_BYTES,
  maxLanguages: MAX_LANGUAGES,
  maxLanguageTagLength: 32,
});

