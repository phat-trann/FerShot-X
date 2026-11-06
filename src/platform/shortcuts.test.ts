import { expect, it } from "vitest";
import { emptyHotkeys, shortcutStatus } from "./shortcuts";
import { toNativeHotkeyBindings } from "../features/hotkey-wire-codec";

it("round trips current canonical native bindings back to editable UI state", () => {
  const draft = { ...emptyHotkeys(), "capture-area": { key: "a", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true } };
  const result = shortcutStatus({ bindings: toNativeHotkeyBindings(draft), faulted: false });
  expect(result.draft).toEqual(draft); expect(result.faulted).toBe(false);
});
it("rejects incomplete, noncanonical and reserved native state without registration", () => {
  expect(() => shortcutStatus({ bindings: {}, faulted: false })).toThrow();
  expect(() => shortcutStatus({ bindings: { ...toNativeHotkeyBindings(emptyHotkeys()), "capture-area": "Super+Super+KeyA" }, faulted: false })).toThrow();
  expect(() => shortcutStatus({ bindings: { ...toNativeHotkeyBindings(emptyHotkeys()), "capture-area": "Super+Space" }, faulted: false })).toThrow();
});
