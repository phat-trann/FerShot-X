# A205 — Finish Composition Gestures, Backdrop Controls, and Runnable Component

## Summary
- **Six Interactive Composition & Backdrop Controls**:
  - Exposed interactive controls in `DirectLayoutSurface.tsx` for all six previously unused state setters:
    - `Explicit pixels per point` (`scale` / `setScale`)
    - `Corner radius` (`cornerRadius` / `setCornerRadius`)
    - `Backdrop color` (`color` / `setColor`)
    - `Second backdrop color` (`endColor` / `setEndColor`, for `linear-gradient` and `radial-gradient`)
    - `Gradient angle` (`angle` / `setAngle`, for `linear-gradient`)
    - `Backdrop image` (`backgroundId` / `setBackgroundId`, for `image` fill kind)
- **Complete Gesture Path for Backdrop Inset, Layer Move/Resize, and Drift-Free Canvas Resize**:
  - Bound `onPointerMove`, `onPointerUp`, `onPointerCancel`, and `onLostPointerCapture` on the outer `<section ref={surfaceRef}>` (as well as `onLostPointerCapture` on `stageRef`) and added pointer capture (`captureGesturePointer` / `releaseGesturePointer`) so dragging `Drag backdrop inset handle`, `Move layer`, `Resize layer`, or `Resize composition canvas` works reliably whether events fire on the handle, stage, or section ancestor.
  - Locked `startScaleX` and `startScaleY` at `pointerDown` (`resolveInitialScales`) so live stage DOM dimension changes during `canvas-resize` do not cause scale drift.
  - Added `useEffect` reset when `selected.id`, `selected.width`, or `selected.height` changes, and `useEffect` rollback when `busy` transitions to `true` mid-gesture.
- **Backdrop Preview Geometry Matching `planBackdropLayout` & Non-Square Layer Fit**:
  - Expanded stage and `data-testid="direct-layout-backdrop-preview"` to true output dimensions `outputWidth = displayCanvas.width + effectiveInset * 2` and `outputHeight = displayCanvas.height + effectiveInset * 2`.
  - Positioned `data-testid="direct-layout-content-card"` at `(contentDrawX, contentDrawY)` (`left: inset, top: inset`) and offset each composition layer to `(contentDrawX + displayLayer.x, contentDrawY + displayLayer.y)` so the `inset` border of the backdrop fill/gradient/image and shadow is visibly exposed around the foreground content card.
  - Styled layer `<img>` elements with `width: "100%", height: "100%", objectFit: "fill"` so resized non-square / non-aspect-ratio layer boxes fit their target rectangles matching `renderCompositionToPngBlob`.

## Verification
- `npx vitest run src/features/direct-manipulation/DirectLayoutSurface.test.tsx` — 2 tests passed.
