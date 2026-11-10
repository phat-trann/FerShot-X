import React, { useState } from "react";
import type { Annotation, AnnotationTool } from "../../../contracts/editor";
import {
  createEditorState,
  editorReducer,
  type EditorAction,
  type EditorState,
} from "../model";
import {
  DEFAULT_ALLOWED_EDITOR_TOOLS,
  EditorToolbar,
} from "../toolbar";
import { EditorView } from "../view/EditorView";
import "./EditorWorkbench.css";

export interface EditorWorkbenchProps {
  readonly imageId: string;
  readonly imageSrc: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly initialAnnotations?: readonly Annotation[];
  readonly historyLimit?: number;
  readonly defaultTool?: AnnotationTool;
  readonly allowedTools?: readonly AnnotationTool[];
  readonly zoom?: number;
  readonly disabled?: boolean;
  readonly busy?: boolean;
  readonly onAnnotationsChange?: (
    imageId: string,
    annotations: readonly Annotation[],
  ) => void;
  readonly onExportAnnotations?: (
    imageId: string,
    annotations: readonly Annotation[],
  ) => void;
}

function cloneAnnotations(
  annotations: readonly Annotation[],
): readonly Annotation[] {
  return Object.freeze(
    annotations.map((ann) =>
      Object.freeze({
        ...ann,
        points: Object.freeze(ann.points.map((pt) => Object.freeze({ ...pt }))),
        style: Object.freeze({ ...ann.style }),
      }),
    ),
  );
}

export function EditorWorkbench({
  imageId,
  imageSrc,
  imageWidth,
  imageHeight,
  initialAnnotations = [],
  historyLimit = 100,
  defaultTool = "select",
  allowedTools = DEFAULT_ALLOWED_EDITOR_TOOLS,
  zoom,
  disabled = false,
  busy = false,
  onAnnotationsChange,
  onExportAnnotations,
}: EditorWorkbenchProps): React.JSX.Element {
  const isBlocked = Boolean(disabled || busy);
  const [selectedTool, setSelectedTool] = useState<AnnotationTool>(() =>
    allowedTools.includes(defaultTool) ? defaultTool : "select",
  );
  const [historiesByImageId, setHistoriesByImageId] = useState<
    ReadonlyMap<string, EditorState>
  >(
    () =>
      new Map<string, EditorState>([
        [
          imageId,
          createEditorState({
            annotations: initialAnnotations,
            historyLimit,
          }),
        ],
      ]),
  );

  const currentEditorState =
    historiesByImageId.get(imageId) ??
    createEditorState({
      annotations: initialAnnotations,
      historyLimit,
    });

  const dispatchForCurrentImage = (action: EditorAction) => {
    if (isBlocked) {
      return;
    }
    const baseState =
      historiesByImageId.get(imageId) ??
      createEditorState({
        annotations: initialAnnotations,
        historyLimit,
      });
    const nextState = editorReducer(baseState, action);
    if (nextState === baseState && historiesByImageId.has(imageId)) {
      return;
    }

    setHistoriesByImageId((prev) => {
      const next = new Map(prev);
      next.set(imageId, nextState);
      return next;
    });

    if (
      action.type !== "select" &&
      nextState.present.annotations !== baseState.present.annotations
    ) {
      onAnnotationsChange?.(
        imageId,
        cloneAnnotations(nextState.present.annotations),
      );
    }
  };

  const { present, past, future } = currentEditorState;
  const canUndo = !isBlocked && past.length > 0;
  const canRedo = !isBlocked && future.length > 0;
  const canDeleteSelected = !isBlocked && present.selectedId !== null;

  const handleDeleteSelected = () => {
    if (isBlocked || !present.selectedId) {
      return;
    }
    dispatchForCurrentImage({ type: "delete", id: present.selectedId });
  };

  const handleExport = () => {
    if (isBlocked) {
      return;
    }
    onExportAnnotations?.(imageId, cloneAnnotations(present.annotations));
  };

  return (
    <section
      className="fershot-editor-workbench"
      aria-label={`Editor workbench for ${imageId}`}
      aria-busy={busy || undefined}
      aria-disabled={isBlocked || undefined}
      data-image-id={imageId}
    >
      <div className="fershot-editor-workbench__bar">
        <EditorToolbar
          selectedTool={selectedTool}
          allowedTools={allowedTools}
          supportedTools={allowedTools}
          canUndo={canUndo}
          canRedo={canRedo}
          canDeleteSelected={canDeleteSelected}
          onSelectTool={(tool) => {
            if (!isBlocked && allowedTools.includes(tool)) {
              setSelectedTool(tool);
            }
          }}
          onUndo={() => dispatchForCurrentImage({ type: "undo" })}
          onRedo={() => dispatchForCurrentImage({ type: "redo" })}
          onDeleteSelected={handleDeleteSelected}
        />

        <div className="fershot-editor-workbench__status">
          <span aria-live="polite">
            {present.annotations.length}{" "}
            {present.annotations.length === 1 ? "annotation" : "annotations"}
          </span>
          {onExportAnnotations && (
            <button
              type="button"
              disabled={isBlocked}
              className="fershot-editor-workbench__export-btn"
              onClick={handleExport}
            >
              Export Annotations
            </button>
          )}
        </div>
      </div>

      <EditorView
        key={imageId}
        imageSrc={imageSrc}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        annotations={present.annotations}
        selectedAnnotationId={present.selectedId}
        tool={selectedTool}
        zoom={zoom}
        disabled={disabled}
        busy={busy}
        onAnnotationCreate={(annotation) =>
          dispatchForCurrentImage({ type: "add", annotation })
        }
        onAnnotationSelect={(id) =>
          dispatchForCurrentImage({ type: "select", id })
        }
        onAnnotationUpdate={(updated) =>
          dispatchForCurrentImage({
            type: "update",
            id: updated.id,
            changes: {
              points: updated.points,
              text: updated.text,
              counter: updated.counter,
              style: updated.style,
            },
          })
        }
      />
    </section>
  );
}

export { EditorWorkbench as Workbench };
