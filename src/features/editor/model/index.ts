import type { Annotation } from "../../../contracts/editor";

export interface EditorSnapshot {
  readonly annotations: readonly Annotation[];
  readonly selectedId: string | null;
  readonly nextCounter: number;
}
export interface EditorState {
  readonly present: EditorSnapshot;
  readonly past: readonly EditorSnapshot[];
  readonly future: readonly EditorSnapshot[];
  readonly historyLimit: number;
}
export type EditorAction =
  | { type: "add"; annotation: Annotation }
  | { type: "update"; id: string; changes: Partial<Omit<Annotation, "id">> }
  | { type: "delete"; id: string }
  | { type: "select"; id: string | null }
  | { type: "undo" }
  | { type: "redo" };

function copyAnnotation(input: Annotation, nextCounter: number): Annotation {
  const tools = new Set(["arrow", "rectangle", "ellipse", "pen", "text", "counter", "blur"]);
  if (!input.id.trim() || !tools.has(input.tool) || !input.points.length ||
      input.points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    throw new RangeError("Annotations require a unique ID, supported tool and finite image-pixel points.");
  }
  if (!input.style.color.trim() || !Number.isFinite(input.style.strokeWidth) || input.style.strokeWidth <= 0 ||
      !Number.isFinite(input.style.opacity) || input.style.opacity < 0 || input.style.opacity > 1) {
    throw new RangeError("Invalid annotation style.");
  }
  const counter = input.tool === "counter" ? input.counter ?? nextCounter : undefined;
  if (counter !== undefined && (!Number.isSafeInteger(counter) || counter < 1 || counter >= Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Counter values must be positive safe integers with room for the next number.");
  }
  return Object.freeze({ ...input, counter,
    points: Object.freeze(input.points.map((p) => Object.freeze({ ...p }))),
    style: Object.freeze({ ...input.style }),
  });
}

function snapshot(annotations: readonly Annotation[], selectedId: string | null, nextCounter: number): EditorSnapshot {
  return Object.freeze({ annotations: Object.freeze([...annotations]),
    selectedId: annotations.some((a) => a.id === selectedId) ? selectedId : null, nextCounter });
}
function state(present: EditorSnapshot, past: readonly EditorSnapshot[], future: readonly EditorSnapshot[], historyLimit: number): EditorState {
  return Object.freeze({ present, past: Object.freeze([...past]), future: Object.freeze([...future]), historyLimit });
}

export function createEditorState(options: { annotations?: readonly Annotation[]; historyLimit?: number } = {}): EditorState {
  const limit = options.historyLimit ?? 100;
  if (!Number.isInteger(limit) || limit < 0 || limit > 1000) throw new RangeError("History limit must be an integer from 0 to 1000.");
  const annotations: Annotation[] = [];
  let nextCounter = 1;
  for (const item of options.annotations ?? []) {
    if (annotations.some((a) => a.id === item.id)) throw new RangeError("Duplicate annotation ID.");
    const annotation = copyAnnotation(item, nextCounter);
    annotations.push(annotation);
    if (annotation.counter !== undefined) nextCounter = Math.max(nextCounter, annotation.counter + 1);
  }
  return state(snapshot(annotations, null, nextCounter), [], [], limit);
}

function commit(current: EditorState, present: EditorSnapshot): EditorState {
  const past = current.historyLimit === 0 ? [] : [...current.past, current.present].slice(-current.historyLimit);
  return state(present, past, [], current.historyLimit);
}

export function undo(current: EditorState): EditorState {
  if (!current.past.length) return current;
  return state(current.past[current.past.length - 1], current.past.slice(0, -1),
    [current.present, ...current.future], current.historyLimit);
}

export function redo(current: EditorState): EditorState {
  if (!current.future.length) return current;
  return state(current.future[0], [...current.past, current.present].slice(-current.historyLimit),
    current.future.slice(1), current.historyLimit);
}

export function editorReducer(current: EditorState, action: EditorAction): EditorState {
  const { present } = current;
  if (action.type === "undo") return undo(current);
  if (action.type === "redo") return redo(current);
  if (action.type === "select") {
    const id = present.annotations.some((a) => a.id === action.id) ? action.id : null;
    return id === present.selectedId ? current : state(snapshot(present.annotations, id, present.nextCounter), current.past, current.future, current.historyLimit);
  }
  if (action.type === "delete") {
    if (!present.annotations.some((a) => a.id === action.id)) return current;
    return commit(current, snapshot(present.annotations.filter((a) => a.id !== action.id), present.selectedId, present.nextCounter));
  }
  if (action.type === "add") {
    if (present.annotations.some((a) => a.id === action.annotation.id)) throw new RangeError("Duplicate annotation ID.");
    const annotation = copyAnnotation(action.annotation, present.nextCounter);
    const nextCounter = Math.max(present.nextCounter, (annotation.counter ?? 0) + 1);
    return commit(current, snapshot([...present.annotations, annotation], annotation.id, nextCounter));
  }
  const old = present.annotations.find((a) => a.id === action.id);
  if (!old) return current;
  const annotation = copyAnnotation({ ...old, ...action.changes, id: old.id }, present.nextCounter);
  return commit(current, snapshot(present.annotations.map((a) => a.id === old.id ? annotation : a), present.selectedId,
    Math.max(present.nextCounter, (annotation.counter ?? 0) + 1)));
}
