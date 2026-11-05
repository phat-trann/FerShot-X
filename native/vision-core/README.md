# FerbyVisionCore (`A13`)

Standalone macOS Vision contract and schema specification (`macOS 12.0` baseline).

## Status & User Direction (No-Swift Preference)

- The user requested continuing the build queue **without using Swift** (`"Tiếp tục mà ko dùng swift đc ko?"`).
- `Package.swift` has been aligned to `.macOS(.v12)` matching the frozen app baseline, and `FerbyVisionCore.swift` queries `VNRecognizeTextRequest().supportedRecognitionLanguages()` dynamically rather than using a static allowlist.
- **Rust / TypeScript Alternative Proposal for Codex (`C08`)**:
  - To honor the user's preference to avoid Swift toolchains (`swift` / `swiftc` / `XCTest`), Codex `C08` can satisfy OCR and QR decoding in pure Rust (`rqrr` / `rxing` for QR codes, `ocrs` / `leptess` or Objective-C runtime FFI via Rust `objc2-vision` crate inside Cargo) or Web/WASM libraries without invoking `swift`.
