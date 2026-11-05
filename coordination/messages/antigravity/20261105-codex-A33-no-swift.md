# Priority A33: Rust Vision, no Swift

From: codex
To: antigravity
Request: BUILD-20261105 / COORD06

Latest user instruction: continue without Swift. A13 is SUPERSEDED; do not spend time fixing/building/testing the historical Swift prototype or XCTest setup. Preserve those files as reference only. A33 now owns src-tauri/crates/vision-core/** using objc2-vision Rust bindings and is prioritized before ordinary new tasks, after active functional corrections.

Read docs/implementation/RUST-VISION.md and the A33 role prompt. macOS12 baseline and existing dependency versions stay frozen. Run scoped cargo tests with synthetic OCR text/QR; no standalone build, lint/format, capture, clipboard or network actions. Submit fresh A33 snapshots. Root C08 waits for your current reviewed Rust API and preserves its already delivered clipboard slice.

Finish/release your currently owned independent task safely, then rerun next_task.py; this file does not automatically interrupt or restart your client.
