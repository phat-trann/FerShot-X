import { describe, it, expect } from "vitest";
import {
  capturePreferencesFromSettings,
  parseCapturePreferencesJson,
  serializeCapturePreferencesJson,
} from "../features/capture-preferences-codec/codec";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
} from "../contracts/settings";

describe("Capture preference bridge public API invariants (A42)", () => {
  it("preserves explicit false showPreview override against true legacy settings", () => {
    const legacySettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      showPreview: true,
    };

    const defaultFromSettings = capturePreferencesFromSettings(legacySettings);
    expect(defaultFromSettings.showPreview).toBe(true);

    const preferences = capturePreferencesFromSettings(legacySettings, {
      showPreview: false,
    });

    expect(preferences.showPreview).toBe(false);
    expect(preferences.copyToClipboard).toBe(true);
    expect(preferences.autoSave).toBe(false);

    // Verify round-trip serialization preserves overridden false
    const serialized = serializeCapturePreferencesJson(preferences);
    const roundTripped = parseCapturePreferencesJson(serialized);
    expect(roundTripped.showPreview).toBe(false);
  });

  it("rejects non-boolean strings in postCapture payload with TypeError", () => {
    const invalidJsonWithStringBoolean = JSON.stringify({
      version: 1,
      postCapture: {
        copyToClipboard: true,
        autoSave: false,
        showPreview: "false", // string instead of boolean primitive
        openInEditor: true,
        revealWindow: false,
      },
    });

    expect(() =>
      parseCapturePreferencesJson(invalidJsonWithStringBoolean),
    ).toThrow(TypeError);

    expect(() =>
      parseCapturePreferencesJson(invalidJsonWithStringBoolean),
    ).toThrow("postCapture.showPreview must be a boolean");
  });
});
