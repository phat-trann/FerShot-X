import { describe, expect, it } from "vitest";
import { createEditorState, editorReducer, redo, undo } from "../features/editor/model";
import type { Annotation } from "../contracts/editor";

const annotation = (id: string, tool: Annotation["tool"] = "rectangle", counter?: number): Annotation => ({
  id, tool, points: [{ x: 1, y: 2 }, { x: 8, y: 9 }],
  style: { color: "#fff", strokeWidth: 2, opacity: 1 }, counter,
});

describe("editor history regressions", () => {
  it("undo restores the original snapshot after update and delete", () => {
    let state = createEditorState({ annotations: [annotation("a")] });
    const original = state.present;
    state = editorReducer(state, { type: "update", id: "a", changes: { text: "changed" } });
    state = editorReducer(state, { type: "delete", id: "a" });
    state = undo(undo(state));
    expect(state.present).toEqual(original);
  });

  it("invalidates redo after a new edit", () => {
    let state = createEditorState({ annotations: [annotation("a")] });
    state = editorReducer(state, { type: "update", id: "a", changes: { text: "one" } });
    state = undo(state);
    state = editorReducer(state, { type: "update", id: "a", changes: { text: "two" } });
    expect(redo(state)).toBe(state);
  });

  it("allocates a fresh counter after an undo branch", () => {
    let state = createEditorState();
    state = editorReducer(state, { type: "add", annotation: annotation("a", "counter") });
    expect(state.present.annotations[0].counter).toBe(1);
    state = undo(state);
    state = editorReducer(state, { type: "add", annotation: annotation("b", "counter") });
    expect(state.present.annotations[0].counter).toBe(1);
  });

  it("clears selection after delete and restores it on undo", () => {
    let state = createEditorState({ annotations: [annotation("a")] });
    state = editorReducer(state, { type: "select", id: "a" });
    state = editorReducer(state, { type: "delete", id: "a" });
    expect(state.present.selectedId).toBeNull();
    expect(undo(state).present.selectedId).toBe("a");
  });
});
