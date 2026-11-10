# A202 — Direct Region Effects and Draggable Composition (`DirectEffectsSurface`, `DirectLayoutSurface`)

## Summary
- Implemented and exported `DirectEffectsSurface` and `DirectLayoutSurface` from `src/features/direct-manipulation/index.tsx` (in `src/features/direct-manipulation/DirectEffectsSurface.tsx` and `src/features/direct-manipulation/DirectLayoutSurface.tsx`).
- **`DirectEffectsSurface`**:
  - Supports direct pointer drag on the image canvas as well as moving the active effect region and adjusting any of the 8 resize handles (`NW`, `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`) for `blur`, `mosaic`, `solidCover`, and `transparentErase`.
  - Emits a validated `PixelEffectRequest` (`src/features/effects-panel`) on pointer release (`pointerUp`), enforcing the 4-megapixel region safety budget (`MAX_DIRECT_EFFECT_PIXELS = 4_194_304`).
- **`DirectLayoutSurface`**:
  - Supports dragging placed image layers directly on the composition canvas with edge/center snapping (`snapPlacementToEdges`), resizing any selected layer via its 4 corner handles (`NW`, `NE`, `SE`, `SW`), resizing the composition canvas via its SE corner handle, and dragging the backdrop inset handle.
  - Emits a `WorkspaceLayoutPlan` (`src/platform/layout.ts`) via `onCompose(plan)` compatible 1:1 with `composeWorkspaceLayout`.
- **Safety & Rollback**:
  - Clamps coordinates under both Fit scaling (`getBoundingClientRect()`) and explicit `zoom`.
  - Pressing `Escape` or receiving `pointercancel` rolls back an active gesture without committing.
  - `busy === true` disables all handles and blocks pointer gestures.

## Exact Integration API for Codex (`C48` / `C49`)
```tsx
import {
  DirectTransformSurface,
  DirectEffectsSurface,
  DirectLayoutSurface,
} from "./features/direct-manipulation";

// 1. Crop / Resize (A201):
<DirectTransformSurface
  image={selectedImage}
  busy={busy}
  mode={transformMode} // "crop" | "resize"
  zoom={zoom ?? undefined}
  onTransform={(options) => runTransform(selectedImage, options)}
  onCancel={() => setTransformMode(null)}
/>

// 2. Direct Region Effects (A202):
<DirectEffectsSurface
  image={selectedImage}
  busy={busy}
  zoom={zoom ?? undefined}
  onApply={(effect) => runPixelEffect(selectedImage, effect)}
  onCancel={() => setEffectsOpen(false)}
/>

// 3. Direct Draggable Composition & Backdrop (A202):
<DirectLayoutSurface
  images={images}
  selected={selectedImage}
  busy={busy}
  zoom={zoom ?? undefined}
  onCompose={(plan) => runComposeLayout(plan)}
  onCancel={() => setLayoutOpen(false)}
/>
```

## Validation
- `npx vitest run src/features/direct-manipulation/index.test.tsx` (`5 passed`)
- Formatting/lint delegated to Copilot H01.
- Build delegated to Codex.
