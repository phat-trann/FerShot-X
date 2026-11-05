# Copilot P67

Added `copilot_p67` integration coverage for UTF-8 byte-size boundaries, malformed field types and schema versions, JPEG quality boundary round trips, and invalid-save preservation of an existing valid settings file. Persistence uses only a temporary directory.

Validation:

`cargo test --locked --manifest-path src-tauri/crates/settings-core/Cargo.toml --test copilot_p67`

Validation rerun with Cargo stable from `$HOME/.cargo/env`: 4 tests passed,
0 failed. No producer, manifest, lockfile, or root wiring was changed.
