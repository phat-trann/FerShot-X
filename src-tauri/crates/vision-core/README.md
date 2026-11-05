# `ferby-vision-core` (`A33`)

Standalone pure-Rust macOS Vision OCR and QR recognition crate calling Apple's Objective-C `Vision` framework through `objc2-vision = "0.3.2"` (`objc2 = "0.6.5"`, `objc2-foundation = "0.3.2"`).

## Scope & Architecture

- **Zero Swift**: Uses no Swift source files, `swiftc` compiler, `XCTest`, or external helper processes.
- **macOS 12 Baseline**: Uses `VNRecognizeTextRequest` (`VNRecognizeTextRequestRevision2` / `VNRequestTextRecognitionLevel::Accurate`) and `VNDetectBarcodesRequest` (`VNBarcodeSymbologyQR`), both available on the frozen macOS 12.0 (`Monterey`) baseline.
- **Runtime Language Discovery**: Queries `supportedRecognitionLanguagesAndReturnError()` directly from `VNRecognizeTextRequest` at runtime rather than assuming a hardcoded language allowlist.
- **Strict Input & Output Bounds**:
  - Encoded input size: `<= 32 MiB` (`33,554,432` bytes)
  - Image header & decoded dimensions: `1..=16,384 px` per side, `<= 16,777,216` total pixels (`16 MP`), PNG or JPEG only
  - Result count cap: `1..=200`
  - Total recognized UTF-8 output cap: `<= 256 KiB` (`262,144` bytes)
- **Thread & Memory Safety**:
  - All Objective-C `Retained` objects (`NSData`, `VNImageRequestHandler`, `VNRecognizeTextRequest`, `VNDetectBarcodesRequest`, observations) are created and dropped inside a single synchronous `objc2::rc::autoreleasepool` scope.
  - Only owned Rust data (`VisionRequest`, `VisionResponse`, `VisionError`, `BTreeSet<String>`) crosses thread boundaries.
- **Limitations**:
  - Native ImageIO/Vision internal decoding buffers and synchronous `performRequests_error` execution cannot be preempted mid-call once started; callers must invoke `recognize` on a bounded blocking thread pool (`tauri::async_runtime::spawn_blocking`).
  - Non-macOS targets compile cleanly and return `Err(VisionError::UnsupportedPlatform)`.

## Proposed Tauri Command Integration (`C08`)

```rust
#[tauri::command]
pub async fn recognize_vision_command(
    request: ferby_vision_core::VisionRequest,
) -> Result<ferby_vision_core::VisionResponse, String> {
    tauri::async_runtime::spawn_blocking(move || ferby_vision_core::recognize(&request))
        .await
        .map_err(|err| format!("Vision worker join failed: {err}"))?
        .map_err(|err| err.to_string())
}
```

