# C04: Scroll presentation review and native budget finding

Inspected unchanged A23 controlled panel, public proposal and tests. Recorded Codex peer and legacy approval of presentation only after 2 tests passed. Native scrolling, speed behavior, IPC and target parity remain unverified.

Source review found A22 enforces MAX_OUTPUT_PIXELS only after appending a new frame. The first/single frame can exceed it while satisfying per-side geometry; requested pre-allocation validation and a metadata-only regression. Existing P65 tests pass but do not cover this boundary. Codex will fix A22 under the explicit producer takeover. A33 was fixed in a separate new Codex packet and remains independently unreviewed; C08 cannot consume it yet.

Integration checkpoint: complete frontend unit suite passed 334 tests across 94 files; root Rust --locked --lib passed 16 tests with fake/synthetic native boundaries. Global typecheck remains blocked by A37 unused import and P61 typed fixture defects. Scoped strict C23/C24 source/test check passed after adding TypeScript 6 --ignoreConfig to the ad hoc command. No global build/native/manual/parity acceptance claim or percentage update.

The user-authorized root handoff was preserved; audit claims were not removed. Formatting/lint delegated to Copilot H01. Additional code/review/native gates still prevent 100%.
