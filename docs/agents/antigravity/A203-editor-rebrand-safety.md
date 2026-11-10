# A203 — Complete Editor Branding and Gesture State Safety

## Summary
- Rebranded all `ferby` / `Ferby` / `FERBY` class names, CSS rules, and default draft labels in `src/features/editor/**` and `src/features/selection-handles/**` to `fershot` / `FerShot` / `FERSHOT`:
  - `.fershot-selection-handles*` in `SelectionHandlesOverlay.tsx` and `SelectionHandlesOverlay.css` (including explicit handle position rules `--nw` through `--w`).
  - `.fershot-editor-toolbar*` in `EditorToolbar.tsx` and `EditorToolbar.css`.
  - `.fershot-editor-view*` in `EditorView.tsx` and `EditorView.css`.
  - `.fershot-editor-workbench*` in `EditorWorkbench.tsx` and `EditorWorkbench.css`.
  - `.fershot-advanced-workbench*` and `"FERSHOT NOTE"` in `AdvancedWorkbench.tsx` and `AdvancedWorkbench.css`.
- Hardened active-gesture state safety across `SelectionHandlesOverlay`, `EditorView`, `EditorWorkbench`, and `AdvancedWorkbench`:
  - Added `useEffect` rollback whenever `disabled` or `busy` transitions to `true` mid-gesture, releasing pointer capture and clearing active drag/inline-text/transform previews without committing partial history entries.
  - Added pointer capture (`setPointerCapture` / `releasePointerCapture`) and `onLostPointerCapture` rollback on `SelectionHandlesOverlay` and `AdvancedWorkbench` stage alongside `EditorView`.
  - Preserved single undo entry per committed gesture on `pointerUp`.

## Verification
- `npx vitest run src/features/selection-handles/ src/features/editor/` — 7 test files passed (28 tests).
- `grep -rn -i "ferby" src/features/editor/ src/features/selection-handles/` — 0 remaining matches.
