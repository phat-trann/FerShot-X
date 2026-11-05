# C08 clipboard import and Vision boundary

Status: PARTIAL. Reviewed A14 is integrated; A13 OCR/QR bridge remains gated by compatibility/test corrections.

Open clipboard image is an explicit main-workspace action. Background native import uses the existing serialized image job, injected core reader, validated RGBA dimensions/length and bounded PNG output. Only the main window can invoke it; JavaScript supplies no clipboard kind/path/target window. Errors distinguish no-image/unavailable/invalid data; retry does not alter existing session documents. Browser mode returns desktop_required without reading its clipboard.

Root Rust tests: 16 passed, including two fake-reader/typed-PNG alpha/error cases. A14 crate: 3 fake-reader tests passed. Existing Cargo versions remained unchanged; only local settings-core/clipboard-import-core 0.1.0 entries were added. Native system clipboard decoding allocates before post-read bounds, so no hard OS decoder memory guarantee is claimed. Tests never construct the real clipboard reader through its read method.

Frontend adapter and browser test results are recorded in the packet. No actual clipboard read/write, screen capture or privacy operation performed. Formatting/lint delegated to H01.

A13 declares macOS13 while app compatibility baseline is macOS12. Current evidence covers a QR functional harness, with XCTest unavailable under the installed CLT. Requested deployment compatibility, actual language discovery and functional text+QR evidence before native bridge wiring. No app deployment target/version was raised, and no proprietary source or OS settings modified. Clipboard work proceeds independently rather than waiting/polling on Vision.
