import { describe, expect, it } from "vitest";
import { toNativeHotkeyBindings } from "./index";
import type { GlobalActionId, ShortcutBinding } from "../hotkey-panel/HotkeyPanel";

const empty = (): Record<GlobalActionId, ShortcutBinding | null> => ({ "capture-fullscreen": null, "capture-area": null, "capture-window": null, "capture-scrolling": null, "ocr-capture": null });
const binding = (key: string, patch: Partial<ShortcutBinding> = {}): ShortcutBinding => ({ key, metaKey: false, ctrlKey: true, altKey: false, shiftKey: false, ...patch });
function mapped(key: string) { return toNativeHotkeyBindings({ ...empty(), "capture-area": binding(key) })["capture-area"]; }

describe("strict native accelerator adapter", () => {
  it("returns an owned frozen five-action null mapping", () => {
    const input = empty(); const output = toNativeHotkeyBindings(input);
    expect(output).toEqual(input); expect(output).not.toBe(input); expect(Object.isFrozen(output)).toBe(true);
  });

  it("orders modifiers canonically without changing the supplied binding", () => {
    const input = { ...empty(), "capture-area": binding("k", { metaKey: true, altKey: true, shiftKey: true }) };
    expect(toNativeHotkeyBindings(input)["capture-area"]).toBe("Super+Control+Alt+Shift+KeyK");
    expect(input["capture-area"].key).toBe("k");
  });

  it.each([["a", "KeyA"], ["Z", "KeyZ"], ["0", "Digit0"], ["9", "Digit9"], ["f1", "F1"], ["F24", "F24"], [" ", "Space"], ["sPaCe", "Space"],
    ["enter", "Enter"], ["ESCAPE", "Escape"], ["tab", "Tab"], ["backspace", "Backspace"], ["delete", "Delete"], ["insert", "Insert"],
    ["home", "Home"], ["end", "End"], ["pageup", "PageUp"], ["pagedown", "PageDown"], ["arrowleft", "ArrowLeft"], ["arrowright", "ArrowRight"], ["arrowup", "ArrowUp"], ["arrowdown", "ArrowDown"]])("maps supported key %s to its native Code spelling", (key, code) => {
    expect(mapped(key)).toBe(`Control+${code}`);
  });

  it.each(["+", "-", "ä", "return", "KeyA", "Digit1", "F0", "F25", "F01", " enter "])("explicitly rejects unsupported key %s", key => {
    expect(() => mapped(key)).toThrow(/Unsupported native shortcut key/);
  });

  it("retains existing strict type, modifier, duplicate and reserved-key validation", () => {
    expect(() => toNativeHotkeyBindings({ ...empty(), "capture-area": binding("a", { ctrlKey: "true" as unknown as boolean }) })).toThrow();
    expect(() => toNativeHotkeyBindings({ ...empty(), "capture-area": binding("a", { ctrlKey: false }) })).toThrow(/Cmd, Ctrl, or Alt/);
    expect(() => toNativeHotkeyBindings({ ...empty(), "capture-area": binding("a"), "ocr-capture": binding("A") })).toThrow(/already assigned/);
    expect(() => toNativeHotkeyBindings({ ...empty(), "capture-area": binding("q", { ctrlKey: false, metaKey: true }) })).toThrow(/reserved/);
  });

  it("does not allow named Space to bypass reserved or duplicate aliases", () => {
    expect(() => toNativeHotkeyBindings({ ...empty(), "capture-area": binding("Space", { ctrlKey: false, metaKey: true }) })).toThrow(/reserved/);
    expect(() => toNativeHotkeyBindings({ ...empty(), "capture-area": binding("Space"), "ocr-capture": binding(" ") })).toThrow(/already assigned/);
  });
});
