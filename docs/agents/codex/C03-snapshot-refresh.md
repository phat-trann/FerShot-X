# C03 snapshot refresh

Preserved the completed image core. The only source delta from its earlier snapshot is the owned RGBA accessor added for clipboard integration; reviewed its bounded decoded-image precondition and owned return value. No product code changed in this refresh.

Validation: cargo test --manifest-path src-tauri/crates/image-core/Cargo.toml --locked: 10 passed. Formatting/lint delegated to Copilot H01. Snapshot remains subject to independent Antigravity review; no original/native runtime equivalence is asserted.
