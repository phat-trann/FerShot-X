import { describe, expect, it } from "vitest";
import { defaultSettingsCopy, parseSettingsJson, serializeSettings } from "./index";

describe("settings codec", () => {
  it("round-trips version 1 and returns independent values", () => {
    const value = { saveFormat: "jpeg" as const, jpegQuality: 80, downscaleRetina: true, showPreview: false };
    const parsed = parseSettingsJson(serializeSettings(value));
    expect(parsed).toEqual(value);
    parsed.jpegQuality = 1;
    expect(value.jpegQuality).toBe(80);
  });

  it("copies defaults without mutating the frozen contract", () => {
    const copy = defaultSettingsCopy();
    copy.jpegQuality = 10;
    expect(defaultSettingsCopy().jpegQuality).toBe(90);
  });

  it("rejects malformed, unsupported, wrong-type and unknown-key values", () => {
    for (const text of ["{", "{\"version\":2,\"settings\":{}}", "{\"version\":1,\"settings\":{\"saveFormat\":\"png\",\"jpegQuality\":90,\"downscaleRetina\":true,\"showPreview\":true,\"x\":1}}", "{\"version\":1,\"settings\":{},\"extra\":true}"]) {
      expect(() => parseSettingsJson(text)).toThrow();
    }
    expect(() => serializeSettings({ saveFormat: "png", jpegQuality: 1.5, downscaleRetina: false, showPreview: true })).toThrow();
    expect(() => serializeSettings({ saveFormat: "png", jpegQuality: 0, downscaleRetina: false, showPreview: true })).toThrow();
    expect(() => parseSettingsJson('{"version":1,"settings":{"saveFormat":"gif","jpegQuality":90,"downscaleRetina":false,"showPreview":true}}')).toThrow();
  });

  it("rejects oversized input", () => {
    expect(() => parseSettingsJson("x".repeat(16_385))).toThrow(RangeError);
  });
});
