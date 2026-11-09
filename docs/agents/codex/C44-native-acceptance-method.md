# Controlled native acceptance method

The `native-acceptance` Cargo feature adds a bounded test driver to the actual Tauri application. It is disabled by default and ordinary application/release builds do not include its scripts, configuration override or event listeners. No dependency/version changes are required.

Build explicitly with `node node_modules/@tauri-apps/cli/tauri.js build --debug --no-bundle --features native-acceptance`, using the existing Node/Rust paths. Run `rtk proxy python3 scripts/run_native_acceptance.py` after that feature build. Never run the runner against an ordinary binary.

The runner supplies a unique `dev.ferby.shottr.acceptance.c44-<nonce>` identifier and launches three owned processes sequentially. The application config path therefore differs from the user's normal Ferby settings. It seeds an export destination inside that isolated identity; inputs are synthetic canvases. The driver uses the actual production React controls, WKWebView, registered IPC handlers, Rust codecs, local filesystem and Vision framework. It does not replace `invoke` or mock its responses.

Phase 1 imports a real synthetic File, crops via the actual UI, returns to the original, adds a highlight annotation and saves twice through the actual Save button. Rust reads and decodes the two actual files and checks dimensions and annotated pixel values. The pin subcase creates a real owned native child, verifies scale/opacity and forbidden-command enforcement, and closes it; Rust records always-on-top state. OCR checks actual framework language discovery, structured invalid-input rejection and actual OCR panel output.

Phase 2 launches another real process with the same isolated identifier and verifies saved preferences reach the GUI. Only after this passes, the harness intentionally corrupts its own two preference fixtures. Phase 3 launches again, verifies native rejection, usable default UI and exact preservation of the corrupt fixture bytes. Global clipboard, capture, input injection, notifications, login mutations, OS privacy changes and user configuration are never invoked by the driver.

This is real controlled native application acceptance, not manual testing and not Shottr runtime parity. It cannot close real capture/permission restoration or real save-dialog acceptance. Signing/distribution decisions remain separate. Raw reports retain actual paths, checks, export pixels and failures from earlier development attempts; successful final reports supersede failed driver attempts without erasing them.
