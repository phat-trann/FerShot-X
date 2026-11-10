# A209 — Optimize Editor Gesture Lifecycle & Repeated Geometry Work

## Summary
- **`EditorView` (`src/features/editor/view/EditorView.tsx`)**:
  - **Single Bounds Read per Gesture**: Captures overlay `getBoundingClientRect()` once at `pointerDown` into `DraftGesture.bounds` and reuses it across `pointerMove` and `pointerUp`, eliminating repeated layout queries on every pointer move while preserving exact Fit/zoom coordinate mapping.
  - **Skip Redundant Sub-Pixel Re-renders**: Skips `setDraft` updates during `pointerMove` when the mapped image point equals the previous point.
  - **Synchronous Gesture Ownership & Single Commit**: Synchronizes `draftRef` and `inlineTextOpenRef` with React state so `pointerUp` clears active state before releasing pointer capture and commits at most once per gesture (preventing duplicate `pointerUp` or `Enter` + click double commits).
  - **No Stale Commits After Source / Tool / Busy Change**: Aborts active `draft`, `inlineTextDraft`, and `transformPreview` and releases pointer capture whenever `imageSrc`/`imageWidth`/`imageHeight`, `tool`, or `disabled`/`busy` changes.
- **`SelectionHandlesOverlay` (`src/features/selection-handles/SelectionHandlesOverlay.tsx`)**:
  - **Fit & Zoom Scale Preservation**: Resolves scale from the sibling `<svg>` or parent container's rendered bounding box before falling back to `zoom`, ensuring exact image coordinates at both Fit and custom zoom levels.
  - **Eliminated Triple Geometry Recomputation**: Caches `scaleX`, `scaleY`, `baseAnnotation`, `baseBounds`, `previewAnnotation`, and `previewBounds` in `ActiveGesture` at `pointerDown`/`pointerMove` so `getBoundingClientRect()`, `computeAnnotationBounds()`, and point transforms are computed once per distinct pointer move instead of three times across handler + render.
  - **Lifecycle & Single-Commit Guarantees**: Skips no-op commits when points are unchanged (zero-delta clicks), ignores duplicate `pointerMove`/`pointerUp` events, tracks exact `captureTarget` for `releasePointerCapture`, and aborts in-flight gestures when `annotation.id` or image dimensions change.

## Verification
- `npx vitest run src/features/editor/view/EditorView.test.tsx src/features/selection-handles/SelectionHandlesOverlay.test.tsx` — 2 test files passed (11/11 tests).
