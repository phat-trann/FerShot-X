import React, { useMemo, useRef } from "react";
import type { AnnotationTool } from "../../../contracts/editor";
import {
  editorToolShortcuts,
  matchEditorShortcut,
} from "../../shortcuts/editor-shortcuts";
import "./EditorToolbar.css";

export const DEFAULT_ALLOWED_EDITOR_TOOLS: readonly AnnotationTool[] = [
  "select",
  "rectangle",
  "arrow",
  "pen",
];

const SUPPORTED_EDITOR_TOOLS = new Set<AnnotationTool>(
  DEFAULT_ALLOWED_EDITOR_TOOLS,
);

const TOOL_LABELS: Readonly<Record<AnnotationTool, string>> = {
  select: "Select",
  rectangle: "Rectangle",
  arrow: "Arrow",
  pen: "Pen",
  ellipse: "Ellipse",
  text: "Text",
  counter: "Counter",
  blur: "Blur",
};

const SHORTCUT_BY_TOOL: Readonly<Partial<Record<AnnotationTool, string>>> =
  Object.freeze(
    editorToolShortcuts.reduce<Partial<Record<AnnotationTool, string>>>(
      (acc, entry) => {
        acc[entry.tool] = entry.key.toUpperCase();
        return acc;
      },
      {},
    ),
  );

export interface EditorToolbarProps {
  readonly selectedTool: AnnotationTool;
  readonly allowedTools?: readonly AnnotationTool[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canDeleteSelected: boolean;
  readonly onSelectTool: (tool: AnnotationTool) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onDeleteSelected: () => void;
}

export function EditorToolbar({
  selectedTool,
  allowedTools = DEFAULT_ALLOWED_EDITOR_TOOLS,
  canUndo,
  canRedo,
  canDeleteSelected,
  onSelectTool,
  onUndo,
  onRedo,
  onDeleteSelected,
}: EditorToolbarProps): React.JSX.Element {
  const toolButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const visibleTools = useMemo<readonly AnnotationTool[]>(() => {
    const unique: AnnotationTool[] = [];
    for (const candidate of allowedTools) {
      if (
        SUPPORTED_EDITOR_TOOLS.has(candidate) &&
        !unique.includes(candidate)
      ) {
        unique.push(candidate);
      }
    }
    return unique;
  }, [allowedTools]);

  const handleToolButtonKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (
      event.key === "ArrowRight" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowUp"
    ) {
      if (visibleTools.length === 0) {
        return;
      }
      event.preventDefault();
      const delta =
        event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        (index + delta + visibleTools.length) % visibleTools.length;
      toolButtonRefs.current[nextIndex]?.focus();
      return;
    }

    const isComposing = Boolean(
      event.nativeEvent.isComposing ||
        (event as unknown as { isComposing?: boolean }).isComposing,
    );
    const matchedTool = matchEditorShortcut({
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      repeat: event.repeat,
      isComposing,
      target: null,
    });
    if (matchedTool && visibleTools.includes(matchedTool)) {
      event.preventDefault();
      onSelectTool(matchedTool);
    }
  };

  return (
    <div
      className="ferby-editor-toolbar"
      role="toolbar"
      aria-label="Annotation tools"
    >
      <div
        className="ferby-editor-toolbar__group"
        role="group"
        aria-label="Drawing tools"
      >
        {visibleTools.map((tool, index) => {
          const isSelected = selectedTool === tool;
          const label = TOOL_LABELS[tool];
          const shortcut = SHORTCUT_BY_TOOL[tool];
          return (
            <button
              key={tool}
              ref={(el) => {
                toolButtonRefs.current[index] = el;
              }}
              type="button"
              className="ferby-editor-toolbar__btn"
              aria-pressed={isSelected}
              aria-label={`${label} tool`}
              onClick={() => onSelectTool(tool)}
              onKeyDown={(event) => handleToolButtonKeyDown(event, index)}
            >
              <span>{label}</span>
              {shortcut && (
                <kbd
                  className="ferby-editor-toolbar__shortcut"
                  aria-hidden="true"
                >
                  {shortcut}
                </kbd>
              )}
            </button>
          );
        })}
      </div>

      <div
        className="ferby-editor-toolbar__group"
        role="group"
        aria-label="History and selection actions"
      >
        <button
          type="button"
          className="ferby-editor-toolbar__btn"
          disabled={!canUndo}
          onClick={() => {
            if (canUndo) {
              onUndo();
            }
          }}
        >
          Undo
        </button>
        <button
          type="button"
          className="ferby-editor-toolbar__btn"
          disabled={!canRedo}
          onClick={() => {
            if (canRedo) {
              onRedo();
            }
          }}
        >
          Redo
        </button>
        <button
          type="button"
          className="ferby-editor-toolbar__btn ferby-editor-toolbar__btn--danger"
          disabled={!canDeleteSelected}
          onClick={() => {
            if (canDeleteSelected) {
              onDeleteSelected();
            }
          }}
        >
          Delete Selected
        </button>
      </div>
    </div>
  );
}
