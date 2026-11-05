# Copilot P65

Added `copilot_p65` integration coverage with tiny synthetic RGBA row bands. The tests cover malformed buffers with source preservation, mismatched widths, invalid overlap/output options, and channel tolerance exactly at versus above `max_channel_diff`.

Validation:

`cargo test --locked --manifest-path src-tauri/crates/scroll-core/Cargo.toml --test copilot_p65`

Validation rerun with Cargo stable from `$HOME/.cargo/env`: 4 tests passed,
0 failed. No producer, manifest, lockfile, or root wiring was changed.
