import { describe, expect, it } from "vitest";
import { parseSettingsJson } from "../features/settings-codec";
import { DEFAULT_APP_PREFERENCES_SIDECAR, parseAppPreferencesJson, serializeAppPreferencesJson } from "../features/app-preferences-codec";
import { parseHotkeyPreferencesJson, serializeHotkeyPreferencesJson } from "../features/hotkey-preferences-codec";
import { parsePrintPreferencesJson, serializePrintPreferencesJson } from "../features/print-preferences-codec";

describe("preference sidecars remain compatible with root consumers", () => {
  it("valid app settings survive sidecar and existing root settings parser", () => {
    const input = { ...DEFAULT_APP_PREFERENCES_SIDECAR, baseSettings: { saveFormat: "jpeg" as const, jpegQuality: 73, downscaleRetina: true, showPreview: false } };
    const decoded = parseAppPreferencesJson(serializeAppPreferencesJson(input));
    expect(parseSettingsJson(JSON.stringify({ version: 1, settings: decoded.baseSettings }))).toEqual(input.baseSettings);
    expect(decoded.baseSettings).not.toBe(input.baseSettings);
  });

  it.each([0, 50.5])("sidecar rejects quality %s that the root/native schema rejects", quality => {
    const preferences = { ...DEFAULT_APP_PREFERENCES_SIDECAR, baseSettings: { ...DEFAULT_APP_PREFERENCES_SIDECAR.baseSettings, jpegQuality: quality } };
    expect(() => parseSettingsJson(JSON.stringify({ version: 1, settings: preferences.baseSettings }))).toThrow();
    expect(() => serializeAppPreferencesJson(preferences)).toThrow();
  });

  it("shortcut sidecar round-trips a full nullable map without registration", () => {
    const bindings = { "capture-fullscreen": { key: "1", metaKey: true, shiftKey: true, ctrlKey: false, altKey: false },
      "capture-area": null, "capture-window": null, "capture-scrolling": null, "ocr-capture": null };
    expect(parseHotkeyPreferencesJson(serializeHotkeyPreferencesJson(bindings))).toEqual(bindings);
  });

  it("print sidecar preserves actual-size and fractional point margins", () => {
    const options = { imageWidth: 100, imageHeight: 80, paper: "letter" as const, orientation: "landscape" as const, marginPt: 18.5, scaleMode: "actual" as const };
    expect(parsePrintPreferencesJson(serializePrintPreferencesJson(options))).toEqual(options);
  });
});
