# A214 — Invalidate Cached Gesture Geometry After Zoom or Layout Changes

## Summary
- **Zoom Rerender Abort (`src/features/editor/view/EditorView.tsx`, `src/features/selection-handles/SelectionHandlesOverlay.tsx`)**:
  - Added `zoom` (`safeZoom`) to the gesture abort `useEffect` and stored `zoom` on `DraftGesture` / `ActiveGesture` for synchronous verification in `handlePointerMove`, `handlePointerUp`, `updateGesture`, and `finishGesture`.
  - When `zoom` changes mid-gesture, active creation and selection gestures are immediately aborted (`clearActiveDraft(true)` / `cancelGesture()`), releasing pointer capture and preventing stale cached-bounds commits.
- **Event / Observer Geometry Invalidation (`resize`, `scroll`, `ResizeObserver`)**:
  - Attached `window` `"resize"`, `window` `"scroll"` (capture phase), and `ResizeObserver` invalidation listeners that set `boundsInvalidatedRef` / `geometryInvalidatedRef` only when viewport or stage layout changes occur during an active gesture.
  - Ordinary `pointerMove` events remain free of repeated `getBoundingClientRect()` layout reads (`1` read at `pointerDown`), while any intermediate scroll or stage resize triggers a single refresh on the next pointer event and computes exact image-space coordinates.
- **Regression Coverage (`src/testing/codex-gesture-zoom-invalidation.test.tsx`)**:
  - Preserved Codex's original zoom-invalidation test and extended the file with `SelectionHandlesOverlay` zoom-change abort and viewport `scroll`/`resize` invalidation regressions.

## Verification
- `npx vitest run src/testing/codex-gesture-zoom-invalidation.test.tsx src/features/editor/view/EditorView.test.tsx src/features/selection-handles/SelectionHandlesOverlay.test.tsx` — 3 test files passed (14/14 tests).
