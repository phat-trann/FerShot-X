import { describe, expect, it } from "vitest";
import type { Annotation } from "../../../contracts/editor";
import { createEditorState, editorReducer, redo, undo } from "./index";

const annotation = (id: string, tool: Annotation["tool"] = "rectangle"): Annotation => ({
  id, tool, points: [{ x: 10, y: 20 }, { x: 40, y: 50 }],
  style: { color: "#ff0000", strokeWidth: 2, opacity: 1 },
});

describe("annotation history", () => {
  it("drops the redo branch after a new edit and retains earlier snapshots", () => {
    const initial = createEditorState();
    const first = editorReducer(initial, { type: "add", annotation: annotation("a") });
    const second = editorReducer(first, { type: "add", annotation: annotation("b") });
    const branched = editorReducer(undo(second), { type: "add", annotation: annotation("c") });
    expect(branched.present.annotations.map((a) => a.id)).toEqual(["a", "c"]);
    expect(redo(branched)).toBe(branched);
    expect(second.present.annotations.map((a) => a.id)).toEqual(["a", "b"]);
    expect(initial.present.annotations).toHaveLength(0);
  });
  it("clears a deleted selection and restores it on undo", () => {
    const added = editorReducer(createEditorState(), { type: "add", annotation: annotation("a") });
    const deleted = editorReducer(added, { type: "delete", id: "a" });
    expect(deleted.present.selectedId).toBeNull();
    expect(undo(deleted).present.selectedId).toBe("a");
    expect(redo(undo(deleted)).present.annotations).toHaveLength(0);
  });
  it("allocates counters across explicit numbers, undo and branching", () => {
    let s = editorReducer(createEditorState(), { type: "add", annotation: annotation("a", "counter") });
    s = editorReducer(s, { type: "add", annotation: { ...annotation("b", "counter"), counter: 9 } });
    s = editorReducer(s, { type: "add", annotation: annotation("c", "counter") });
    expect(s.present.annotations.map((a) => a.counter)).toEqual([1, 9, 10]);
    s = editorReducer(undo(s), { type: "add", annotation: annotation("d", "counter") });
    expect(s.present.annotations[2].counter).toBe(10);
    expect(s.present.nextCounter).toBe(11);
  });
  it("bounds history and supports disabling history", () => {
    let s = createEditorState({ historyLimit: 2 });
    for (const id of ["a", "b", "c"]) s = editorReducer(s, { type: "add", annotation: annotation(id) });
    expect(s.past).toHaveLength(2);
    expect(undo(undo(undo(s))).present.annotations.map((a) => a.id)).toEqual(["a"]);
    const noHistory = editorReducer(createEditorState({ historyLimit: 0 }), { type: "add", annotation: annotation("a") });
    expect(undo(noHistory)).toBe(noHistory);
  });
  it("copies external nested data so later caller mutations cannot corrupt history", () => {
    const input = annotation("a");
    const s = editorReducer(createEditorState(), { type: "add", annotation: input });
    input.style.color = "blue";
    input.points[0].x = 999;
    expect(s.present.annotations[0].style.color).toBe("#ff0000");
    expect(s.present.annotations[0].points[0].x).toBe(10);
    const edited = editorReducer(s, { type: "update", id: "a", changes: { text: "hello" } });
    expect(undo(edited).present.annotations[0].text).toBeUndefined();
  });
  it("keeps selection out of edit history and handles missing targets without an edit", () => {
    const s = editorReducer(createEditorState(), { type: "add", annotation: annotation("a") });
    const selected = editorReducer(s, { type: "select", id: "missing" });
    expect(selected.present.selectedId).toBeNull();
    expect(selected.past).toEqual(s.past);
    expect(editorReducer(s, { type: "delete", id: "missing" })).toBe(s);
    expect(editorReducer(s, { type: "update", id: "missing", changes: { text: "x" } })).toBe(s);
  });
  it("rejects invalid state without silently corrupting a snapshot", () => {
    const s = editorReducer(createEditorState(), { type: "add", annotation: annotation("a") });
    expect(() => editorReducer(s, { type: "add", annotation: annotation("a") })).toThrow(/Duplicate/);
    expect(() => editorReducer(s, { type: "update", id: "a", changes: { points: [{ x: NaN, y: 0 }] } })).toThrow();
    expect(() => createEditorState({ historyLimit: -1 })).toThrow();
    expect(() => editorReducer(s, { type: "add", annotation: { ...annotation("n", "counter"), counter: Infinity } })).toThrow();
    expect(s.present.annotations).toHaveLength(1);
  });
});
