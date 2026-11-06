import { describe, expect, it } from "vitest";
import {
  parseAppPreferencesJson,
  serializeAppPreferencesJson,
} from "../features/app-preferences-codec";
import type { FerbyAppPreferences } from "../features/app-preferences/AppPreferencesPanel";

const preferences: FerbyAppPreferences = {
  postCaptureBehavior: "save-only",
  defaultZoomPercent: 175,
  keepEditorAlwaysOnTop: true,
  showSystemNotifications: false,
  launchAtLogin: false,
  showInMenuBar: true,
  baseSettings: {
    saveFormat: "jpeg",
    jpegQuality: 75,
    downscaleRetina: true,
    showPreview: false,
  },
};

describe("app preferences codec independent regressions", () => {
  it("round-trips nondefault preferences and nested base settings", () => {
    const parsed = parseAppPreferencesJson(serializeAppPreferencesJson(preferences));
    expect(parsed).toEqual(preferences);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.baseSettings)).toBe(true);
  });

  it("rejects unsupported schema and unknown fields", () => {
    expect(() =>
      parseAppPreferencesJson(
        JSON.stringify({ version: 2, preferences }),
      ),
    ).toThrow(/schema version/i);
    expect(() =>
      parseAppPreferencesJson(
        JSON.stringify({
          version: 1,
          preferences: { ...preferences, extra: true },
        }),
      ),
    ).toThrow(/unknown field/i);
  });

  it("rejects wrong booleans and invalid finite ranges", () => {
    expect(() =>
      parseAppPreferencesJson(
        JSON.stringify({
          version: 1,
          preferences: { ...preferences, launchAtLogin: "false" },
        }),
      ),
    ).toThrow(/boolean/i);
    expect(() =>
      parseAppPreferencesJson(
        JSON.stringify({
          version: 1,
          preferences: {
            ...preferences,
            baseSettings: { ...preferences.baseSettings, jpegQuality: 50.5 },
          },
        }),
      ),
    ).toThrow(/integer between 1 and 100/i);
    expect(() =>
      parseAppPreferencesJson(
        JSON.stringify({
          version: 1,
          preferences: {
            ...preferences,
            baseSettings: { ...preferences.baseSettings, jpegQuality: 0 },
          },
        }),
      ),
    ).toThrow(/integer between 1 and 100/i);
  });

  it("rejects oversized UTF-8 input", () => {
    const oversized = JSON.stringify({
      version: 1,
      preferences: {
        ...preferences,
        baseSettings: {
          ...preferences.baseSettings,
          saveFormat: "png",
        },
      },
    }) + "x".repeat(16_384);
    expect(() => parseAppPreferencesJson(oversized)).toThrow(/16384 UTF-8 bytes/i);
  });
});
