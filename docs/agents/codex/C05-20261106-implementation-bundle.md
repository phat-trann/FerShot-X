# Implementation-first app bundle

Completed source/app wiring for extended preferences and post-capture actions, average region color, native Ferby links, persistent shortcuts, native PNG drag, explicit fixed-region/repeat capture, native menus and menu bar visibility.

Checks: TypeScript no-emit, locked offline Rust compilation, configured tsc/Vite build and unsigned debug macOS bundle passed. Initial bundling lacked Cargo on PATH; rerun with the existing Cargo directory succeeded. Product remains 0.1.0/macOS12.0. Twelve additive lock entries; no prior package upgraded or removed.

Tests: NOT RUN — deferred by user. No native OS action performed. Formatting/lint delegated to Copilot H01. Snapshot/bundle hashes and remaining C26–C29 source work are in coordination/handoffs/codex/20261106-implementation-first.json. External Anti receives isolated A43 only during this production pass.

USER_WAIVED_REVIEW; later overall review required. Original/runtime parity and final/native acceptance remain open. MVP acceptance before/after: 68.75% → 68.75%.
