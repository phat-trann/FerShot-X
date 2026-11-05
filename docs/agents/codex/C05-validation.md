# C05 validation and native boundary hardening

Status: DONE for assigned regression/hardening scope, not full native acceptance. Request: BUILD-20261105.

## Changes

Shared limits reject imported files over 20 MiB, native encoded images over 32 MiB, dimensions over 16384 and images over 16777216 pixels. Browser dimension checks occur after browser decoding; they are not a strict browser decoder memory cap. Import failure revokes owned object URLs; successful import transfers URL ownership to the workspace.

Native response checks reject malformed/mismatched PNG metadata before URL allocation. Mutating Rust commands additionally require the injected caller window label `main`; names such as pin/remote/main-child are rejected. Capability registration remains main-only core permissions, with no frontend general filesystem/shell permission. CSP restricts packaged network connections to IPC; dev localhost exceptions are development-only. Root custom commands validate their own requests/window origin rather than assuming a capability name alone protects custom commands.

Regression tests cover multi-image selection/close/same-file reimport/error recovery, desktop-required browser errors, bounded window layout and the crop/resize/save adapter path. Native IPC is mocked in the browser tests; canvas rasterization uses the real browser. Synthetic PNGs only. Save cancellation and delayed job control are tested without opening a native dialog or writing files.

## Actual validation

- Full Vitest suite: 51 tests across 12 files passed.
- Playwright: 6 tests passed (4 new regressions plus 2 baseline), including real synthetic browser import/canvas behavior and explicitly mocked IPC.
- Root Rust: 6 tests passed; strict clippy passed. Capture crate: 7 fake-runner tests passed; image crate: 10 synthetic filesystem/pixel tests passed during C02/C03.
- Final sequential `npm run tauri build -- --debug --bundles app`: passed, including TypeScript and Vite production build. Output: `src-tauri/target/debug/bundle/macos/Ferby Shottr.app`.
- No real screen capture, native save-dialog interaction, privacy permission changes, signing/notarization or production installation was performed. A native GUI acceptance pass remains required.

## Deferred integration

C04 remains partial: A01-A04 need corrected/current packets; P02/P05 have concrete review requests. Domain annotation state and pin presentation do not prove annotations/native pin are shipped. Round 2 delegates composition/rendering/settings work to Antigravity and bounded helpers/tests to Copilot. Codex integrates after review.
