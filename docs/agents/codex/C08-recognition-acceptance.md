# C08 bounded OCR and UI integration acceptance

The existing Rust Vision core ran 10 tests successfully, including actual macOS Vision recognition of generated text and QR plus runtime language discovery, bounds/invalid-input checks and output-budget regressions. This uses synthetic images only and no screenshot/clipboard/OS settings. Command: cargo test --locked --offline --manifest-path src-tauri/crates/vision-core/Cargo.toml. One documentation example remains ignored.

Two new Playwright checks passed through the actual app UI, real browser raster normalization and recognition controller to a mocked native transport: text/QR requests, displayed results and explicit copy payloads, and cancellation suppressing late results. No recognition runs on mount. Command: playwright test tests/e2e/codex-recognition.spec.ts (Node 26). Native command/core wiring compiled and 16 root Rust tests passed; browser mocks do not prove native UI permission/lifecycle acceptance.

Credit bounded engine/core, synthetic recognition and UI/copy integration gates. Native acceptance/failure handling remains unaccepted. User authorized Codex code to count as reviewed, marked USER_WAIVED_REVIEW for later overall review; no independent review fabricated. Formatting/lint delegated to Copilot H01. Source remains partial for final native acceptance, not original Shottr parity.
