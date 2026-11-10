# A201 — Drag Crop and Resize Surface (`DirectTransformSurface`)

## Summary
- Implemented and exported `DirectTransformSurface` from `src/features/direct-manipulation/index.tsx` matching the exact Phase-2 contract:
  - `{ image: ImageDocument, busy: boolean, mode: 'crop' | 'resize', zoom?: number, onTransform: (options: { crop?: { x: number; y: number; width: number; height: number }; resize?: { width: number; height: number } }) => void, onCancel: () => void }`
- **Crop mode (`mode === "crop"`)**:
  - Supports direct pointer drag selection on the image stage as well as moving the crop region and dragging any of the 8 crop handles (`NW`, `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`).
  - Displays live coordinate and dimension readout during `pointerMove` and commits a single `onTransform({ crop })` operation on pointer release (`pointerUp`).
- **Resize mode (`mode === "resize"`)**:
  - Supports dragging any of the 4 corner handles (`NW`, `NE`, `SE`, `SW`) with live dimension readout and commits a single `onTransform({ resize })` operation on pointer release (`pointerUp`).
- **Safety & Rollback**:
  - Clamps coordinates under both Fit scaling (`getBoundingClientRect()`) and explicit `zoom`.
  - Pressing `Escape` or receiving `pointercancel` rolls back an active gesture without invoking `onTransform`; pressing `Escape` when idle or clicking `Cancel` invokes `onCancel()`.
  - `busy === true` disables all handles and prevents pointer gestures.

## Validation
- `npx vitest run src/features/direct-manipulation/index.test.tsx` (`3 passed`)
- Formatting/lint delegated to Copilot H01.
- Build delegated to Codex.
