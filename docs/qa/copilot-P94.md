# P94 pixel effects panel boundary

Five RTL regressions pass for explicit blur/mosaic parameters, RGBA cover and transparent erase, out-of-image/work-budget rejection, invalid radius/alpha recovery, no callback on render and busy Apply suppression. Tests use the public form labels and callback union; no raster implementation is copied or producer source edited.

Command: Node 26 `vitest run src/testing/copilot-effects-panel.test.tsx` — 1 file, 5 tests passed. No native effects, rendering or OS action executed. No functional defect found within covered callback cases; these controls do not establish pixel-algorithm or original Shottr parity. Build/integration delegated to Codex.
