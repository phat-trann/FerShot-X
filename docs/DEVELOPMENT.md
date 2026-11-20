# Development

Use the repository’s `.nvmrc` (Node 26.13.0) and the existing Rust toolchain. Do not change global Node defaults.

```sh
npm ci
npm run version:check
npm run tauri dev
```

Safe automated checks use injected native APIs and synthetic image data:

```sh
npm run typecheck
npm run test:unit
npm run test:e2e
```

Build only when packaging is intended:

```sh
npm run build
cargo test --manifest-path src-tauri/Cargo.toml --lib --offline
npm run tauri build -- --bundles app
```

`package.json` is the version source. After an intentional version change, run `npm run version:sync`; `npm run version:check` checks renderer, native and lockfile metadata and the README heading. Keep versions unchanged while a candidate awaits acceptance. Patches fix existing behavior; minor versions add compatible features.

Commit and push require explicit user acceptance. An increased stable version pushed to `main` triggers the existing signed macOS release workflow. Ordinary pushes without a version increase skip release creation. Preserve the updater public key and configured app-signing identity. See [release configuration](releases/UPDATES.md) for user-managed secrets and signing setup.

Never commit credentials, signing private keys, captures, generated evidence or build output. Native capture, notification, multi-display and real signed-update checks remain distinct from injected browser tests. Historical research and immutable review packets preserve their original provenance.

## Native Live Text bridge

The only Swift feature code is `src-tauri/live-text`, a dependency-free Swift package wrapping public VisionKit ImageAnalyzer/ImageAnalysisOverlayView for macOS 13+. The user authorized this narrow exception in C178; capture/recording and other native features remain Rust. `build.rs` uses already-locked swift-rs 1.0.9 to build its static archive. Install the normal Apple command-line tools; no Swift version upgrade or third-party OCR engine is needed. VisionKit is weak-linked and Swift concurrency loads from `/usr/lib/swift`; runtime availability gates older systems.

Library sends the loaded PNG to Rust only after explicit Live Text activation. PNGs are bounded to 32 MiB base64/32 megapixels, viewport/caller/request IDs are validated, and native analysis is limited to two in-flight tasks with one displayed view. Results/text stay in native memory; the renderer receives only enum status. App-owned IPC contains no extracted text. Close/image changes cancel ownership; stale completions cannot attach to a newer view. Native scroll views are clipped to the Library preview and hidden under DOM modals/loading overlays.

Safe checks: `cargo test --locked --manifest-path src-tauri/Cargo.toml --lib live_text::`; `xcrun swiftc -parse-as-library -target arm64-apple-macosx12.0 src-tauri/live-text/Sources/FerShotLiveText/LiveText.swift tests/native/live-text-checks.swift -Xlinker -weak_framework -Xlinker VisionKit -o artifacts/live-text-checks`, followed by `artifacts/live-text-checks`; injected browser `tests/e2e/codex-c178.spec.ts`. These do not invoke real recognition or the clipboard. Installed text selection, native menu/⌘C, window placement and physical gestures require manual verification.

### Failure diagnostics

Registered application IPC failures are observed centrally at renderer startup; request arguments and error messages are never copied to logs. The bounded command allowlist is shared in `src/platform/diagnostic-operations.json`; add new command names there when wiring IPC. Existing wrappers remain compatible and duplicate failures for the same operation are coalesced for one second. Native panic/start/stop stages and Live Text timeouts have dedicated metadata.

On startup, the latest recent FerShot X `.ips` report is classified as gesture, memory or other native crash. Only that enum is logged once; macOS retains the original crash report. A fatal signal cannot safely run ordinary logging in-process. Inspect `errors.log` and the original DiagnosticReports file for installed crash investigation. This does not replace real-user reproduction or guarantee diagnosis of every failure.
