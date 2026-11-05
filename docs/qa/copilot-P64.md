# Copilot P64

Added `copilot_p64` integration coverage using a counting fake `VisionBackend` and a synthetic 1x1 PNG. The tests cover invalid requests before `execute`, `supported_languages` failure propagation, backend execution failure propagation, and the public UTF-8 output cap.

Validation:

`cargo test --locked --manifest-path src-tauri/crates/vision-core/Cargo.toml --test copilot_p64`

Validation rerun with Cargo stable from `$HOME/.cargo/env`: 4 tests passed,
0 failed. No producer, manifest, lockfile, native backend, or root wiring was
changed.
