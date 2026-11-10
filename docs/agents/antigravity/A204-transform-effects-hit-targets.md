# A204 — Correct Transform and Effect Initial Hit Targets and Resize Geometry

## Summary
- **Initial Hit Targets & Reselection (`DirectTransformSurface` & `DirectEffectsSurface`)**:
  - In `DirectTransformSurface` (`mode="crop"`), when the crop box covers the full image (`isFullImageCrop`), `.fershot-direct-transform__body` (`Move crop region`) uses `pointerEvents: "none"` and `data-hit-mode="crop-drag"` so dragging anywhere inside the image stage initiates `"crop-drag"` to create a new crop region rather than being intercepted as a clamped no-op `"crop-move"`. Once a sub-region is drawn (`!isFullImageCrop`), `.fershot-direct-transform__body` enables `pointerEvents: "auto"` for `"crop-move"`, its 8 handles resize the crop box, and dragging the stage outside the box reselects a new crop region.
  - In `DirectEffectsSurface`, the default inset region (`16, 16`, up to `120 × 80`) keeps `pointerEvents: "none"` and `data-hit-mode="draw"` on `.fershot-direct-transform__body` (`Move effect region`) before a custom region is drawn (`!hasCustomRegion`), allowing an initial image drag anywhere on the canvas to create a new effect region. Once a region is committed (`hasCustomRegion === true`), `Move effect region` switches to `pointerEvents: "auto"` (`"move"`) while stage drags outside the box draw a new region.
- **Native Aspect-Preserving Corner Resize & Enlargement Preview (`DirectTransformSurface`)**:
  - Added `fitAspectPreservingResize` and updated `applyResizeHandleDelta` to match `fershot_image_core::Raster::resize(max_width, max_height)` integer fit math and pixel bounds (`MAX_TRANSFORM_DIMENSION = 16_384`, `MAX_TRANSFORM_PIXELS = 16_777_216`).
  - Removed the `Math.min(100, ...)` clamp on the `Resize frame box` preview dimensions and enabled `.fershot-direct-transform__stage--resize` (`overflow: visible`) so enlargement (>100%) is accurately previewed on stage.
- **Pointer Capture, Release Outside, `lostpointercapture`, `Escape`, and `busy` Transitions**:
  - Captured pointers on `stageRef.current` across `DirectTransformSurface` and `DirectEffectsSurface`, releasing capture on `pointerUp`, `pointerCancel`, `Escape`, and mid-gesture `busy` transitions (`useEffect`), and rolling back active gestures on `onLostPointerCapture`.
- **Rebranding**:
  - Rebranded `.ferby-direct-transform*` to `.fershot-direct-transform*` across `DirectTransformSurface.css`, `index.tsx`, and `DirectEffectsSurface.tsx`.

## Verification
- `npx vitest run src/features/direct-manipulation/index.test.tsx` — 4 tests passed.
