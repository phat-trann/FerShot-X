# C16 current integration acceptance checkpoint

Status: PARTIAL. Product version 0.1.0 and dependency/deployment baseline preserved. This is not a parity or release approval.

## Delivered source integration

C07: reviewed 3-tool editor, per-image history, selection/delete, original preview, merge and annotated raster copy/save/crop/resize with temporary URL cleanup. C08: explicit main-only clipboard image import. C09: bounded fixed-route native pin windows, owner-only get/copy/edit/close commands and controlled image scale/opacity. C10: app-owned explicit preference persistence and actual export format/quality use. Native commands remain validated and blocking work off the UI thread.

## Final observed checks

- Full frontend unit checkpoint: 195 tests across 68 files passed. This includes workers' independent tests; passing a test does not approve their unreviewed modules.
- Selected current Codex/baseline/A08 renderer E2E: all 22 passed. Browser pixels, alpha, zoom, annotation/history, library, mock IPC import/copy/save/pin and mock preference reload are covered. No actual OS clipboard/capture/dialog/window actions are executed by these tests.
- Root Rust checkpoint: all 16 passed, including fake clipboard import, pin ownership/limits, typed imaging, preference tempdir roundtrip and rejection. A09 core 7 and A14 core 3 passed separately.
- Full TypeScript/Vite build and local macOS debug application bundle passed. Output: src-tauri/target/debug/bundle/macos/Ferby Shottr.app (37.70 MiB at this build). Earlier A16 tuple errors were corrected in worker source before this successful full build; no worker file was overwritten or excluded by Codex.
- Coordination tests: 13 passed after no-Swift dispatch changes. Existing Cargo package/version pairs stayed unchanged; the new entries are local settings/clipboard crates at 0.1.0. No native Swift implementation/helper is linked by the app entrypoints.
- Formatting/lint/clippy/whitespace checks delegated to Copilot H01; none run by Codex. A nonfatal Vite dynamic-import hint does not block this build and was not cosmetically changed.

## Open boundaries and skipped scopes

Rust-only A33 replaces historical Swift A13. C08 OCR/QR resumes only after current A33 functional evidence and approval. No OCR gate is credited.

C09 timed post-capture preview and whole-window desktop transparency are not complete. Image opacity is currently a CSS effect inside an opaque native window. C10 actual downscale/preview preference effects require further native capture metadata/preview integration. These tasks remain PARTIAL.

C11 scrolling and C12 advanced shape/effect/backdrop/composition modules have local exports but still require complete source reviews, compatible shared contracts and native orchestration; they were not silently wired or claimed complete. C13 app-preferences, C14 session archive and C15 local-output required exports were absent at the scope audit and were skipped without waiting/polling. Native-only manual capture/permission/dialog/pin/restart acceptance and complete feature-map parity remain open.

## Progress

Current MVP acceptance is 61.25%, up from 47.5%: composed gestures/editor +5, bounded real-browser annotation renderer +5, tested standalone settings persistence +1.25 and restricted pin/controls implementation +2.5. Native manual gates, annotated OS end-to-end export and OCR gates remain unchecked. Scope/weights were not changed to inflate progress; the broader function roadmap is tracked separately.
