# C10 bounded preference persistence

Status: PARTIAL. Reviewed A09 persistence and P08 strict frontend codec are connected through load_preferences/save_preferences. Paths come only from Tauri app_config_dir(), not JS. Main-window validation and a serialized blocking preference gate protect read/write operations. Missing files return explicit defaults; malformed files surface an error without automatic overwrite. Only Save preferences writes.

Preferences controls expose implemented format/JPEG-quality values and actual export uses both. Browser defaults are session-only. Native stored downscale/preview fields are preserved but not exposed as working controls because reliable capture scale/floating preview effects remain unimplemented. C10 is therefore not complete, and no restart/native-GUI gate is claimed.

Actual checks: root Rust 12 tests passed (2 preference tempdir tests plus 10 existing), A09 crate 7 passed, frontend adapter 3 passed and 2 browser tests passed with explicitly mocked persistence across page reload and quality forwarded to export. TypeScript/Vite build passed. Existing Cargo.lock package versions were verified unchanged; only local ferby-settings-core 0.1.0 was added. tempfile direct dev use is pinned to the already locked 3.27.0 version.

No real preferences in the user profile were written by tests, no native dialog/clipboard/capture operated, and no formatting/lint run. Hygiene remains H01. Full native preference application and actual app restart/invalid-file acceptance remain open.
