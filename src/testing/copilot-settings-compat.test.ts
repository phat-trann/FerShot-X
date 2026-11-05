import { describe, expect, it } from "vitest";
import { defaultSettingsCopy, parseSettingsJson, serializeSettings } from "../features/settings-codec";
import { DEFAULT_SETTINGS } from "../contracts/settings";

describe("settings codec compatibility fixtures", () => {
  it("preserves the exact version-1 envelope and defaults", () => {
    const value = defaultSettingsCopy();
    expect(JSON.parse(serializeSettings(value))).toEqual({ version: 1, settings: value });
    expect(value).toEqual(DEFAULT_SETTINGS);
    expect(parseSettingsJson(serializeSettings(value))).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips the supported fields and rejects unknown versions/types", () => {
    const value = { saveFormat: "jpeg" as const, jpegQuality: 75, downscaleRetina: true, showPreview: false };
    expect(parseSettingsJson(serializeSettings(value))).toEqual(value);
    expect(() => parseSettingsJson('{"version":0,"settings":{}}')).toThrow();
    expect(() => parseSettingsJson('{"version":1,"settings":{"saveFormat":"png","jpegQuality":"90","downscaleRetina":false,"showPreview":true}}')).toThrow();
    expect(() => parseSettingsJson('{"version":1,"settings":{"saveFormat":"png","jpegQuality":90,"downscaleRetina":false,"showPreview":true},"extra":"x"}')).toThrow();
  });

  it("rejects malformed, out-of-range and oversized input", () => {
    expect(() => parseSettingsJson("{not-json")).toThrow();
    expect(() => parseSettingsJson('{"version":1,"settings":{"saveFormat":"png","jpegQuality":101,"downscaleRetina":false,"showPreview":true}}')).toThrow();
    expect(() => parseSettingsJson("x".repeat(16_385))).toThrow();
  });
});
