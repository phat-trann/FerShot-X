# A208 — Align Direct Composition Preview with Backdrop Renderer

## Summary
- Updated `src/features/direct-manipulation/DirectLayoutSurface.tsx` to import and call `planBackdropLayout` from `src/features/backdrop/backdrop-renderer.ts` via `computeDirectBackdropPreviewLayout`:
  - Matches `outputWidth` (`canvasWidth`), `outputHeight` (`canvasHeight`), `contentDrawX` (`drawX`), and `contentDrawY` (`drawY`) directly against the backdrop renderer's layout geometry helper.
  - Expands the stage (`data-testid="direct-layout-stage"`) and backdrop preview (`data-testid="direct-layout-backdrop-preview"`) to `outputWidth × outputHeight` and offsets the foreground content card (`data-testid="direct-layout-content-card"`) and all composition layers by `(contentDrawX, contentDrawY)` so the inset border and chosen backdrop fill (solid, linear-gradient, radial-gradient, or session image) are visibly exposed around the foreground layers.
  - Fits layer `<img>` pixels to arbitrary resized rectangle dimensions (`width: "100%", height: "100%", objectFit: "fill"`).
  - Previews drop shadow consistently on `direct-layout-content-card` (`0px 8px 16px #000000`) when `Add shadow` is enabled.
- Added DOM/style geometry and reset regression tests in `src/features/direct-manipulation/DirectLayoutSurface.test.tsx`:
  - Verifies exact parity between `computeDirectBackdropPreviewLayout` and `planBackdropLayout`.
  - Verifies stage/backdrop/content-card/layer DOM geometry and pixel-fit styles across canvas resize, non-square layer resize, backdrop inset drag, fill kind switches, shadow toggle, backdrop disable reset, and selected-image change reset.

## Verification
- `npx vitest run src/features/direct-manipulation/DirectLayoutSurface.test.tsx` — 3/3 tests passed.
