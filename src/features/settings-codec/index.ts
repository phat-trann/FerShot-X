import { DEFAULT_SETTINGS, type AppSettings } from "../../contracts/settings";

const MAX_INPUT_LENGTH = 16_384;
const KEYS = ["saveFormat", "jpegQuality", "downscaleRetina", "showPreview"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSettings(value: unknown): AppSettings {
  if (!isRecord(value) || (value.saveFormat !== "png" && value.saveFormat !== "jpeg") ||
      typeof value.jpegQuality !== "number" || !Number.isInteger(value.jpegQuality) ||
      !Number.isFinite(value.jpegQuality) || value.jpegQuality < 1 || value.jpegQuality > 100 ||
      typeof value.downscaleRetina !== "boolean" || typeof value.showPreview !== "boolean") {
    throw new TypeError("invalid settings");
  }
  const unknown = Object.keys(value).filter((key) => !(KEYS as readonly string[]).includes(key));
  if (unknown.length) throw new TypeError(`unknown settings keys: ${unknown.join(", ")}`);
  return {
    saveFormat: value.saveFormat,
    jpegQuality: value.jpegQuality,
    downscaleRetina: value.downscaleRetina,
    showPreview: value.showPreview,
  };
}

export function parseSettingsJson(text: string): AppSettings {
  if (typeof text !== "string" || text.length > MAX_INPUT_LENGTH) throw new RangeError("settings JSON is too large");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TypeError("settings JSON is malformed");
  }
  if (!isRecord(parsed) || parsed.version !== 1) throw new TypeError("unsupported settings version");
  const envelopeKeys = Object.keys(parsed);
  if (envelopeKeys.some((key) => key !== "version" && key !== "settings")) {
    throw new TypeError("unknown envelope keys");
  }
  return validateSettings(parsed.settings);
}

export function serializeSettings(value: AppSettings): string {
  const settings = validateSettings(value);
  return JSON.stringify({ version: 1, settings });
}

export function defaultSettingsCopy(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}
