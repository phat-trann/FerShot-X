# C15 native PNG drag-out

Implemented a main-window-only native drag pipeline using CrabNebula drag 2.1.1. Explicit Prepare renders current annotations/output scaling, normalizes bounded PNG and stages a private file plus 128-pixel preview. Pointer-down starts the macOS drag session on the main thread; cancellation and results return through the workspace operation handler. Prepared tokens prevent arbitrary filesystem paths. Native job ownership blocks conflicting operations; closing clears retained exports.

Keep at most four completed exports for asynchronous consumers, plus one prepared export. Native Finder/drop behavior and crash-time cleanup remain unverified.

A30/P71 accept an optional root-supplied native control; existing callbacks remain compatible. Existing authorship preserved.

Checks: TypeScript no-emit and locked offline Rust compilation passed. Lock comparison: 12 additive packages, zero existing packages removed/upgraded. Tests: NOT RUN — deferred by user. Formatting/lint delegated to Copilot H01.

Ferby decision; Shottr drag implementation remains UNKNOWN. USER_WAIVED_REVIEW; later overall review required. Acceptance remains 68.75%.

API source: https://github.com/crabnebula-dev/drag-rs and installed drag-2.1.1 Rust source. Original output declarations: ../copilot/T05-export-audit.md; no original runtime parity inferred.
