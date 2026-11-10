# A207 — Direct Editing Gesture-Boundary Regressions

## Summary
- Added independent functional regression suite in `src/testing/antigravity-direct-gesture-boundaries.test.tsx` exercising the published public APIs of `DirectTransformSurface`, `DirectEffectsSurface`, `DirectLayoutSurface`, and `fitAspectPreservingResize`:
  1. **Crop Initial-Body Reselection & Out-of-Bounds Clamping**:
     - Verifies initial full-image crop body passes pointer hits through (`data-hit-mode="crop-drag"`, `pointerEvents: "none"`) to draw a new crop selection, switches to `data-hit-mode="crop-move"` (`pointerEvents: "auto"`) on sub-region selection, and clamps stage re-selection drags released outside image bounds.
  2. **Aspect-Preserving Corner Resize**:
     - Verifies `fitAspectPreservingResize` and `DirectTransformSurface` in `mode="resize"` preserve source aspect ratio (`400×200` -> `2:1`) on corner drag for both downscaling (`300×150`, `75%`) and enlargement above `100%` (`600×300`, `150%`).
  3. **Gesture Abort / Rollback & Source Reset**:
     - Verifies `pointercancel`, `lostpointercapture`, `Escape`, and mid-gesture `busy={true}` transitions abort active gestures and restore prior readout/geometry without calling `onTransform` or `onCancel`.
     - Verifies changing `image` / `selected` resets `DirectTransformSurface`, `DirectEffectsSurface`, and `DirectLayoutSurface` back to the new source's initial geometry and hit modes.
  4. **Layout Inset & Layer Gesture Boundaries**:
     - Verifies `DirectLayoutSurface` backdrop inset drag expands output bounds (`outputWidth × outputHeight`) and shifts layer DOM offsets (`left`, `top`) to match `planBackdropLayout`.

## Limitations & Scope
- Synthetic jsdom regression checks only; does not claim browser layout engine or native macOS runtime parity.
- No producer files were modified under `A207`.

## Verification
- `npx vitest run src/testing/antigravity-direct-gesture-boundaries.test.tsx` — 4/4 tests passed.
