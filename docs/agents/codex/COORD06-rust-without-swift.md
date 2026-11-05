# COORD06: continue without Swift

Status: DONE for language policy, worker allocation and dispatcher update. User instruction: continue without Swift.

Native application work remains Rust; frontend remains React/TypeScript. Selected maintained objc2-vision 0.3.2 bindings call Apple's Objective-C Vision APIs directly. Existing objc2 0.6.5/framework family 0.3.2 and macOS12/0.1.0 baseline remain frozen. This is a dependency/API plan, not a claim that OCR is implemented.

A13 Swift prototype is superseded by priority A33, owning only src-tauri/crates/vision-core/**. Historical Swift files are preserved as reference and removed from active dispatch/build/helper instructions. A33 requires bounded Rust OCR/QR, runtime language support and synthetic functional tests; no Swift compiler/helper, XCTest, screen/clipboard/network operations or root registration. Codex C08 requires its current approved packet before root linking.

Selector now skips superseded work even when old reviews requested changes, supports priority tasks and current reviewed-input gating, and resumes partial integration after a newer dependency approval. Thirteen coordination tests passed, including both new routing conditions. Live read-only selection returns A33. Existing root package/build.rs entrypoints contain no Swift invocation and no Swift prototype was compiled, packaged or called.

Updated AGENTS, active queue, role prompts, kickoff/continuous lists, feature map, RUST-VISION.md and durable Antigravity handoff. Did not delete another agent's source or raise any product/dependency/deployment version. Current app integration validation is recorded separately under C16; broad parity is not complete.
