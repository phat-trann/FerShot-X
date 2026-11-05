# Rust-only Vision OCR/QR integration

Latest user constraint: no Swift implementation, compiler/package step or runtime Swift helper. Keep Tauri 2, Rust and React/TypeScript with frozen 0.1.0/dependency baseline. The old native/vision-core Swift prototype is reference-only; A13 is superseded by A33 and must not be selected even if its historical review requested changes.

## Selected API boundary

Use the existing Apple Vision Objective-C API directly through maintained Rust bindings, not a reimplementation of OCR or manual unchecked Objective-C messaging:

- [objc2-vision 0.3.2 features](https://docs.rs/crate/objc2-vision/0.3.2/features).
- [VNRecognizeTextRequest](https://docs.rs/objc2-vision/0.3.2/objc2_vision/struct.VNRecognizeTextRequest.html).
- [VNDetectBarcodesRequest](https://docs.rs/objc2-vision/0.3.2/objc2_vision/struct.VNDetectBarcodesRequest.html).
- [Apple original Objective-C Vision API](https://developer.apple.com/documentation/vision/original-objective-c-and-swift-api).

Pin objc2-vision to 0.3.2; reuse already locked objc2 0.6.5 and framework-binding family 0.3.2. Select minimal features and APIs/revisions available on macOS12; verify runtime selectors/capabilities where needed. Do not raise the application deployment target or upgrade existing dependencies. Calling Apple's system framework from Rust does not require writing/building a Swift helper.

## Ownership and contract

Antigravity A33 owns only `src-tauri/crates/vision-core/**`: nested Cargo manifest/lockfile, Rust implementation, fixtures and tests. Exports must be owned Rust request/result/error values suitable for serde; no retained native objects crossing thread boundaries and no unsafe Send/Sync escape hatches. Use a bounded worker/autoreleasepool and document every unsafe call's preconditions.

Validate encoded bytes before native decode, image header dimensions/pixels before full raster allocation, finite bounds, result count and total UTF-8 output. Use the existing application's 16 megapixel/16384-side limits or stricter explicit limits. Recognized strings and QR payloads remain inert; never execute/open a payload or automatically copy it. Query runtime language support, not a presumed installed-language list. Document any unavoidable native decoder allocations and timeout/cancellation limits honestly.

Code must not spawn Swift/AppleScript/CLI OCR, capture a display, read/write the clipboard, change permissions/preferences or access remote images. Only supplied image bytes are processed. Unsupported platforms return an explicit result.

## Validation and root integration

Run Rust functional tests with synthetic text and QR images and verify actual recognized output. Test malformed/oversized inputs, unsupported language, empty results, bounds and typed errors; no XCTest/Swift build dependency. Antigravity runs tests only, with no lint/format or standalone production build. Copilot H01 owns hygiene.

Codex C08 integrates only a current approved A33 packet, links the local Rust crate, registers constrained native commands, offloads work and connects reviewed OCR/QR panels. Its previously delivered clipboard-import slice remains functional. Missing Rust core or pending review is a skip condition, not permission for Codex to take the worker's implementation. The selector resumes C08 after a newer current input approval, without polling.
