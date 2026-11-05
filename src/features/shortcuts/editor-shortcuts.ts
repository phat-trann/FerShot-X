import type { AnnotationTool } from "../../contracts/editor";

export interface EditorShortcutInput {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  target?: {
    tagName?: string;
    isContentEditable?: boolean;
  } | null;
}

export interface EditorToolShortcut {
  key: string;
  tool: AnnotationTool;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export const editorToolShortcuts: readonly EditorToolShortcut[] = [
  { key: "v", tool: "select", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
  { key: "a", tool: "arrow", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
  { key: "r", tool: "rectangle", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
  { key: "o", tool: "ellipse", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
  { key: "p", tool: "pen", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
  { key: "t", tool: "text", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
  { key: "c", tool: "counter", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
  { key: "b", tool: "blur", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
];

function isTextTarget(target: EditorShortcutInput["target"]): boolean {
  const tagName = target?.tagName?.toLowerCase();
  return target?.isContentEditable === true || tagName === "input" || tagName === "textarea" || tagName === "select";
}

export function matchEditorShortcut(input: EditorShortcutInput): AnnotationTool | null {
  if (input.isComposing || input.repeat || isTextTarget(input.target)) return null;

  const key = input.key.toLowerCase();
  const shortcut = editorToolShortcuts.find((candidate) =>
    candidate.key === key &&
    candidate.altKey === Boolean(input.altKey) &&
    candidate.ctrlKey === Boolean(input.ctrlKey) &&
    candidate.metaKey === Boolean(input.metaKey) &&
    candidate.shiftKey === Boolean(input.shiftKey),
  );
  return shortcut?.tool ?? null;
}
