# COORD11: Additional bounded Copilot tasks

The user requested further division of work. P58-P61 packets are complete; P53/P54 corrections and P62/P63 remain open. Added P64-P67 independent Rust integration regressions for the existing Vision, scrolling, archive and settings public APIs. Each reads only lib.rs/Cargo.toml, owns one new integration test plus report, and uses the existing lockfile. No producer source is changed.

Exact integration-test targets exclude native Vision tests. Fake backends/synthetic buffers are required; session/settings persistence may use only isolated tempfile directories. Occupied producer scopes are skipped and saved as blocked rather than polled. Codex retains producer corrections, builds and integration. Historical claims/reviews and final acceptance gates remain unchanged.

Validation commands/results are recorded in the completion packet. No product tests are claimed for this coordination-only change; worker tests are not implemented yet. Formatting/lint delegated to Copilot H01.
