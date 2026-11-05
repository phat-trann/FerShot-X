# C00 foundation validation

Date: 2026-11-05, Asia/Ho_Chi_Minh. Scope: runnable Tauri/Rust foundation, parallel task queues and common completion/review workflow.

## Installed or reused

| Tool | Observed state |
| --- | --- |
| Node / npm | Reused nvm Node 26.13.0 / npm 11.20.0; default Node 8 alias preserved |
| Rust / Cargo | Installed stable rustc 1.99.1 / Cargo 1.99.1 with minimal profile; rustfmt and clippy installed |
| Shell environment | rustup used no-modify-path; shell profile files were not edited; select `$HOME/.cargo/env` in the development shell |
| macOS compiler | Existing Xcode Command Line Tools / clang used successfully |
| Native framework | Tauri Rust 2.12.5; JS API/CLI 2.12.4, resolved in lockfiles |
| Frontend | React 19.3.1, TypeScript 6.0.3, Vite 8.3.5 |
| Test tooling | Playwright 1.64.1; Vitest, React Testing Library, jest-dom and jsdom installed for scoped worker tests |
| Browser | Reused installed Google Chrome with an isolated test browser; no user's browser profile was opened |

Scaffolding came from the official create-tauri-app React/TypeScript template, prepared outside the repository and copied without overwriting research/IDE files. Only required development tooling/dependencies were installed; no native reverse-engineering provider or AI-client extension was installed.

## Actual checks

| Check | Result |
| --- | --- |
| Frontend production build | TypeScript and Vite passed |
| Browser E2E | 2 passed: real PNG import/dimensions/zoom/fit/close; corrupt-file rejection preserves prior document |
| Native compile | `cargo check` passed |
| Rust wire contract | `cargo test --lib`: 1 passed for app_info serialization |
| Rust formatting / lint | `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` passed |
| macOS bundle | Final `tauri build --debug --bundles app` passed; `src-tauri/target/debug/bundle/macos/Ferby Shottr.app`, approximately 28.35 MiB |
| Native startup smoke | Built executable started without immediate stderr/exit; deliberately stopped with Ctrl-C. This is not automated verification of its WKWebView interactions |
| Review workflow | 5 Python tests passed: concurrent submissions retained, no partial JSON exposed to readers, pending/approved/stale behavior, exclusive claims/owner-only release, outside-repository path rejection |
| Task queues | 15 unique task definitions and five prompts per role validated; each requires completion packets and scoped ownership |
| Artifact handling | `.vscode`, node_modules, Rust targets/generated schemas, captures and test output confirmed ignored; source/manifests/lockfiles remain reviewable |
| Visual inspection | Browser screenshot of the empty workspace inspected for layout; retained locally at `artifacts/qa/workspace-empty.png` |

Feature-scoped Vitest infrastructure is installed/configured; future task unit tests were not claimed as already executed. No fabricated no-tests pass is used.

## Research review carried forward

Antigravity T02's fifteen reported native imports were checked against saved REA Mach-O output. Screen Recording and Accessibility observation attempts have explicit `capability_unavailable` errors. Imports are STATIC_OBSERVED, implementation pairings INFERRED, target runtime UNKNOWN. The integration report was updated without rerunning blocked calls or modifying OS permissions.

## Practical limits

- C00 implements local import/preview/session management and metadata IPC. Capture, annotations, OCR, export, persistence and native pin behavior are assigned queue work, not shipped features.
- Browser tests do not establish all native WKWebView/file-drop behavior, native capture permissions or a full desktop end-to-end workflow.
- The application is a local debug build with template-generated icons; signing/notarization/distribution and installation into `/Applications` were not performed.
- Existing Git edits and other agents' reports were preserved. No commit, staging, reset or push was performed. One legacy Copilot relative-link correction remains attributed in the research integration review; that author's file was not overwritten.
- Submission packets start PENDING. The source snapshots and an actual Codex review are distinct from successful build/test results.
