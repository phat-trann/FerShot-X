# C06: Snapshot refresh after measurement integration

The selector reopened C06 because the shared Workspace hash changed during C12 measurement wiring. The C06 native/clipboard implementation and other snapshot source paths remain unchanged; the Workspace diff adds explicit measurement controls/imprint and mode arbitration. Refreshed only after inspecting that shared integration diff and exercising existing copy/native boundaries.

Validation: native.ts plus independent clipboard-boundary Vitest passed 8 tests; root Rust --locked --lib passed 16 fake/synthetic tests. The current selected browser batch passed 10 tests, including clipboard error/retry and annotated raster output plus measurement/editor/pin/preferences. These are not actual clipboard or native GUI acceptance. Global typecheck remains blocked by existing A37/P61 errors; the new measurement/root scope passed strict checking with test setup included. No standalone production build pass is claimed. Formatting/lint delegated to Copilot H01.

No C06 business logic was rewritten and no native clipboard was accessed. New hash-bound snapshot requires fresh independent review; prior approval is not transferred automatically.
