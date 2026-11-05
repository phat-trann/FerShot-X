# P56 Effects Pipeline Acceptance Audit

Scope: `effects-pipeline/src/lib.rs` and `Cargo.toml` only. The code preserves
input bytes, validates all effects before applying them, applies effects in
caller order, and maps decode/effect/encode failures to explicit errors.

Findings:

1. **Medium — decode allocation limit gap:** `preflight` applies `ImageReader`
   limits only while probing headers (lines 81-87), but `run_pipeline` calls
   `Raster::decode(input)` without those limits (line 130). A hostile encoded
   image can therefore allocate beyond the preflight codec ceiling. Reuse a
   bounded decode path or document the residual allocation risk.
2. **Low — output allocation after limit check:** PNG encoding occurs before
   `png.len()` is compared with `max_output_bytes` (lines 137-138); the limit
   rejects oversized output after allocation. A bounded encoder/sizing strategy
   would reduce peak memory.

Scoped validation: `rtk proxy cargo test --manifest-path
src-tauri/crates/effects-pipeline/Cargo.toml` was unavailable because `cargo`
is not installed. No lint/format result is claimed.
