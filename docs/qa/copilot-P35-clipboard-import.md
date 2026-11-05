# P35 Clipboard Import Negative-Path Proposals

Static review of the public injectable API in
`src-tauri/crates/clipboard-import-core/src/lib.rs`. These cases are proposed
only; no real clipboard access or test execution is claimed.

| Case | Exact call | Expected error |
| --- | --- | --- |
| unavailable reader | `import_clipboard_image(&mut reader)` where `read_rgba()` returns `Err(ClipboardImportError::Unavailable("locked".into()))` | `Err(ClipboardImportError::Unavailable("locked".into()))` |
| non-image clipboard | `import_clipboard_image(&mut reader)` where `read_rgba()` returns `Err(ClipboardImportError::NotAnImage)` | `Err(ClipboardImportError::NotAnImage)` |
| zero width | `validate_and_encode_rgba(RawClipboardRgba { width: 0, height: 1, bytes: vec![] })` | `Err(InvalidDimensions { width: 0, height: 1 })` |
| oversized image | `validate_and_encode_rgba(RawClipboardRgba { width: MAX_CLIPBOARD_DIMENSION + 1, height: 1, bytes: vec![] })` | `Err(DimensionLimitExceeded { width: MAX_CLIPBOARD_DIMENSION + 1, height: 1 })` |
| invalid RGBA length | `validate_and_encode_rgba(RawClipboardRgba { width: 2, height: 2, bytes: vec![0; 15] })` | `Err(MalformedRgbaLength { expected: 16, actual: 15 })` |

These cover unavailable, non-image, dimension, oversize, and malformed-buffer
negative paths while keeping the reader injectable and deterministic.
