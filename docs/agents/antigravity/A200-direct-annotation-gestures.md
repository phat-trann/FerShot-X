# A200 — Direct Annotation Gestures

## Summary
- Upgraded `SelectionHandlesOverlay`, `EditorView`, `EditorWorkbench`, `EditorToolbar`, and `AdvancedWorkbench` so direct pointer manipulation on the image canvas is the primary creation, selection, move, and resize workflow across all supported tools (`rectangle`, `arrow`, `pen`, `ellipse`, `line`, `text`, `counter`, `highlight`, `spotlight`, `magnifier`).
- Preserved all existing public APIs (`EditorViewProps`, `EditorWorkbenchProps`, `AdvancedWorkbenchProps`, `SelectionHandlesOverlayProps`) and backward-compatible test selectors.
- Clicking on the image canvas with the `text` tool active places an inline floating text editor at the clamped image coordinates; `Enter` or the inline confirm button commits a single history entry, and `Escape` cancels/rolls back without committing.
- Clicking on the image canvas with the `counter` tool active places a sequential counter badge directly at the clicked image coordinates.
- Dragging a selected annotation body or any of the 8 resize handles updates a live visual preview during `pointerMove` and commits a single Undo/Redo history snapshot on `pointerUp` (`Escape` or `pointercancel` rolls back).
- Clamped pointer coordinates under both Fit scaling (`getBoundingClientRect()`) and explicit `zoom`, and blocked gestures when `disabled` or `busy` is true.

## Integration API
- `EditorView` accepts `EditorViewExtendedProps` (`selectedAnnotationId`, `onAnnotationUpdate`, `zoom`, `disabled`, `busy`, `defaultStyle`, `defaultText`) in addition to `EditorViewProps`.
- `EditorWorkbench` accepts optional `allowedTools`, `zoom`, `disabled`, and `busy` props and wires `SelectionHandlesOverlay` move/resize updates through `editorReducer({ type: "update" })`.
- `AdvancedWorkbench` accepts optional `disabled` and `busy` props and supports direct stage creation/move/resize for `shape`, `contract`, and `emphasis` items.

## Validation
- Scoped Vitest suite (`21 passed` across 6 test files):
  - `npx vitest run src/features/selection-handles/SelectionHandlesOverlay.test.tsx src/features/editor/view/EditorView.test.tsx src/features/editor/workbench/EditorWorkbench.test.tsx src/features/editor/advanced-workbench/AdvancedWorkbench.test.tsx src/features/editor/toolbar/EditorToolbar.test.tsx src/testing/copilot-advanced-workbench.test.tsx`
- Formatting/lint delegated to Copilot H01.
- Build delegated to Codex.
