# Copilot P66

Added `copilot_p66` integration coverage with temporary synthetic archives. The tests cover manifest/payload byte-size mismatch, duplicate IDs, unknown selected IDs, selected-ID/load round-trip integrity, and failed saves preserving the existing manifest and image.

Validation:

`cargo test --locked --manifest-path src-tauri/crates/session-core/Cargo.toml --test copilot_p66`

Validation rerun with Cargo stable from `$HOME/.cargo/env`: 4 tests passed,
0 failed. No producer, manifest, lockfile, or root wiring was changed.
