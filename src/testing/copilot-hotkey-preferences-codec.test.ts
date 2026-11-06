import { describe, expect, it } from "vitest";
import {
  parseHotkeyPreferencesJson,
  serializeHotkeyPreferencesJson,
} from "../features/hotkey-preferences-codec";
import type { GlobalActionId, ShortcutBinding } from "../features/hotkey-panel/HotkeyPanel";

const actions: readonly GlobalActionId[] = [
  "capture-fullscreen",
  "capture-area",
  "capture-window",
  "capture-scrolling",
  "ocr-capture",
];
const nullBindings = Object.fromEntries(actions.map((action) => [action, null])) as Record<
  GlobalActionId,
  ShortcutBinding | null
>;
const bindings: Record<GlobalActionId, ShortcutBinding | null> = {
  ...nullBindings,
  "capture-fullscreen": {
    key: "f",
    metaKey: true,
    shiftKey: true,
    altKey: false,
    ctrlKey: false,
  },
  "capture-area": {
    key: "a",
    metaKey: false,
    shiftKey: false,
    altKey: true,
    ctrlKey: false,
  },
};

describe("hotkey preferences codec independent regressions", () => {
  it("round-trips a complete null map and distinct bindings immutably", () => {
    const parsedNull = parseHotkeyPreferencesJson(
      serializeHotkeyPreferencesJson(nullBindings),
    );
    expect(parsedNull).toEqual(nullBindings);
    const parsed = parseHotkeyPreferencesJson(
      serializeHotkeyPreferencesJson(bindings),
    );
    expect(parsed).toEqual(bindings);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed["capture-fullscreen"])).toBe(true);
  });

  it("rejects missing and extra actions", () => {
    const { ["capture-area"]: _removed, ...missing } = nullBindings;
    expect(() =>
      parseHotkeyPreferencesJson(JSON.stringify({ version: 1, bindings: missing })),
    ).toThrow(/required/i);
    expect(() =>
      parseHotkeyPreferencesJson(
        JSON.stringify({
          version: 1,
          bindings: { ...nullBindings, extra: null },
        }),
      ),
    ).toThrow(/unknown action/i);
  });

  it("rejects wrong modifiers, case-normalized duplicates and reserved keys", () => {
    expect(() =>
      parseHotkeyPreferencesJson(
        JSON.stringify({
          version: 1,
          bindings: {
            ...nullBindings,
            "capture-fullscreen": {
              key: "f",
              metaKey: "true",
              shiftKey: false,
              altKey: false,
              ctrlKey: false,
            },
          },
        }),
      ),
    ).toThrow(/boolean/i);
    const duplicate = {
      ...bindings,
      "capture-window": { ...bindings["capture-fullscreen"], key: "F" },
    };
    expect(() =>
      parseHotkeyPreferencesJson(JSON.stringify({ version: 1, bindings: duplicate })),
    ).toThrow(/already assigned|duplicate/i);
    expect(() =>
      parseHotkeyPreferencesJson(
        JSON.stringify({
          version: 1,
          bindings: {
            ...nullBindings,
            "capture-fullscreen": {
              key: "q",
              metaKey: true,
              shiftKey: false,
              altKey: false,
              ctrlKey: false,
            },
          },
        }),
      ),
    ).toThrow(/reserved/i);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseHotkeyPreferencesJson("{")).toThrow(/invalid.*JSON/i);
  });
});
