import { describe, expect, it } from "vitest";
import { matchEditorShortcut } from "./editor-shortcuts";

describe("matchEditorShortcut", () => {
  it("matches case-insensitively without modifiers", () => {
    expect(matchEditorShortcut({ key: "R" })).toBe("rectangle");
  });

  it("does not capture text input or contenteditable focus", () => {
    expect(matchEditorShortcut({ key: "r", target: { tagName: "input" } })).toBeNull();
    expect(matchEditorShortcut({ key: "t", target: { isContentEditable: true } })).toBeNull();
  });

  it("ignores composition and repeated key events", () => {
    expect(matchEditorShortcut({ key: "p", isComposing: true })).toBeNull();
    expect(matchEditorShortcut({ key: "p", repeat: true })).toBeNull();
  });

  it("rejects unexpected modifiers", () => {
    expect(matchEditorShortcut({ key: "r", shiftKey: true })).toBeNull();
    expect(matchEditorShortcut({ key: "r", ctrlKey: true })).toBeNull();
    expect(matchEditorShortcut({ key: "r", metaKey: true })).toBeNull();
  });
});
