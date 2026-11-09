# C42: flagged source review, integration fixes and UI validation

MVP acceptance: **68.75% before / 68.75% after**. User resumed tests/builds and authorized functional UI completion; older source-only restrictions are superseded. No dependencies, product version or OS baseline were upgraded. Historical external work and immutable records remain intact.

## Actual findings and corrections

| Finding in current source | Correction and evidence |
| --- | --- |
| Native shortcut registry requires eight actions, but WorkspaceShortcuts still used the five-action adapter and panel. Existing browser mocks reproduced the obsolete map. | Connected existing v2 producer panel through `platform/shortcuts-v2.ts`, reading actual eight-action maps and preserving exact v1 migration. Browser regression now returns eight native actions and records area and Show Workspace. |
| V2 codec assigned to its own frozen empty map, throwing on real use. | Mutable local accumulator, immutable returned state, strict v1 fields, canonical alias/reserved-key rejection. Five new adapter/codec regressions. |
| Region selector could deliver fractional rectangles; overlay measured the image but positioned relative to a centered container. Cancel leaked the private screenshot; modal focus was missing. | Integer origins, image-relative percentage overlay, bounded focus, Escape, inert background, screenshot cleanup after crop consumption/cancel/unmount, and display-provenance checks before remembering repeat. Four component regressions and injected-IPC browser cancellation. |
| Window background/shadow-trim controls existed in modules but were not reachable from the production workspace. | Real decoded-source wrapper uses the existing appearance adapter and creates a derived image. Browser checks actual 92×74 output pixels after trim and solid fill, with original preserved. |
| Main composition route exposed solid backdrop only. | Connected existing linear/radial gradient and caller-owned session-image background renderers, bounded source decoding/bitmap ownership. Three real-workspace pixel regressions. |
| Existing color-format helper supported RGB/RGBA but app exposed HEX only. | Pixel/average controls now offer all three existing formats through the restricted clipboard boundary. |
| Inspector siblings shared a React key; settings could extend below a small window; stacked drawers could eliminate canvas access. | Unique keys, bounded scrollable popovers, compact capture grid, scrollable main content, retained canvas area, clearer preferences/drawers, reduced-motion support and keyboard regression. |

External A98, A100 and A101 integration declarations received immutable `changes_requested` records explaining these concrete gaps. Corrected current sources are published under Codex; no external review was impersonated. Codex USER_WAIVED_REVIEW credit remains marked for future overall review. This report does not clear every historical flag by assertion or certify every feature's native behavior.

## Checks on the final source

- Vitest: **122 files / 478 tests passed**, `artifacts/C42-unit-final.log`.
- Playwright: **46 tests passed**, `artifacts/C42-e2e-final.log`. Actual Chrome canvas pixels; native capture/clipboard/dialog/shortcut boundaries injected. New visual/layout/appearance tests exercise production workspace routes.
- Root Rust: **24 tests passed**, `artifacts/C42-rust.log`.
- Twelve standalone Rust crates: **67 tests passed**, `artifacts/C42-crates.log`. Vision uses synthetic inputs; one Vision documentation example remains ignored. Four OS-bound crates contain zero tests; compiling them is not behavioral acceptance.
- **615 executed tests passed**, no failures. Initial failing new regressions and a baseline-library incompatibility were corrected before the final run.
- Final Tauri build ran TypeScript + Vite and compiled/bundled the macOS debug app successfully: `artifacts/C42-app-build-final.log`, `src-tauri/target/debug/bundle/macos/Ferby Shottr.app`. Vite reports a harmless existing mixed static/dynamic import advisory; no chunk split is claimed.
- Visual inspection: `artifacts/qa/C42-workspace-reviewed.png`, `C42-editor-reviewed.png`, `C42-small-verified.png`.
- Coordination records validated; formatting/lint delegated to Copilot H01, not run by Codex.

## Original comparison and remaining acceptance

[Focused REA evidence](C42-shottr-comparison.md) binds the actual Shottr region-selector body to 1.9.3 (137) and the saved executable hash. Static coordinate/rounding instructions were read; native decompiler configuration was absent and objdump hit its output cap. Evidence was exported before session closure. No original runtime behavior was observed or claimed.

Remaining gates require controlled native/manual acceptance: real capture modes/cancel/permission restoration, native save dialogs and existing-file handling, annotated output at the native boundary, native pin/window lifecycle, actual shortcut registration/conflicts, settings restart behavior and native UI OCR/failure handling. Signing/distribution decisions and full overall/source/runtime parity review also remain open. Existing automated coverage and a successful debug bundle cannot silently close those gates.
