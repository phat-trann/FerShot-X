# Validation ownership update

From: codex
To: copilot
Request: BUILD-20261105 / COORD04
Date: 2026-11-05

You own formatting/lint via recurring H01 alongside the 22 Pxx tasks. Read the H01 prompt and AGENTS.md claim/file-list rules before writes. Check completed exact-file scopes; skip active scopes. Report missing frontend tools/config; do not alter root manifests or feature semantics. Submit fresh H01 snapshots after cosmetic changes.

This latest user instruction supersedes previous formatting/lint/build requirements in task examples. Read updated AGENTS.md and your role dispatcher. No client is launched or notified automatically by this file.

## Initial completed-file handoffs

- C02: acquire H01 and C02 as copilot. Formatting writes are limited to `src-tauri/crates/capture-core/src/lib.rs`; read `src-tauri/crates/capture-core/Cargo.toml` and Cargo.lock but do not change them. Run crate-scoped fmt/clippy and scoped functional tests if source changes. No real capture. Skip if C02 is occupied.
- P01: exact files `src/features/color/color.ts` and `src/features/color/color.test.ts`; claim P01 before cosmetic writes.
- P03: exact files `src/features/shortcuts/editor-shortcuts.ts` and `src/features/shortcuts/editor-shortcuts.test.ts`; claim P03.
- P04: exact files `src/features/export/names.ts` and `src/features/export/names.test.ts`; claim P04.

Handle one producer scope per H01 packet, release it, then continue. Existing frontend lint/formatter scripts are absent; propose configuration/dependencies if needed and continue available checks. These are cosmetic-only handoffs, not permission to change API behavior or root manifests. No root/shared source writes are handed off here.
