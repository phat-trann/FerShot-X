# Codex implementation prompts

Use the dispatcher prompt once to execute the queue, or paste a single task prompt for bounded work. Open the same local `ferby-shottr` checkout.

## Queue dispatcher

```text
Work in /Users/phattran/Documents/Code/Personal/ferby-shottr/ as codex.
The user selected Tauri 2 + Rust; the React/TypeScript foundation already exists.
Read AGENTS.md, coordination/reviews/README.md and only your rows in
coordination/BUILD-QUEUE.md. Read frozen contracts named by each task.
Execute C01, C02, C03, C04, C05 in order within their owned paths.
Claim one task atomically using scripts/review_queue.py; if unavailable or
blocked, record the reason and select the next independent task. Do not poll.
Do not modify shared contracts, manifests, lockfiles or app wiring unless your
task explicitly reserves them. Run meaningful targeted checks.
After EACH task, submit an immutable completion packet to
coordination/reviews/submissions/ for Codex, then release your claim.
Continue without waiting for another agent or review. End every user request
with packet IDs, actual checks and remaining risks. Do not claim unwired
components, mocks or builds prove native behavior. Never stage others' work.
```

## C01: Annotation model and history

```text
Execute only C01 in ferby-shottr. Agent: codex.
Read AGENTS.md and the completion protocol. Inputs: src/contracts/editor.ts.
Own only: src/features/editor/model/**.
Implement an immutable annotation state/reducer with add/update/delete/select, bounded undo/redo and counter allocation. Use source-image pixel coordinates. Preserve readonly contract inputs; do not render UI or wire the shell.
Tests cover undo branching after a new edit, deletion/selection consistency, counter allocation and a bounded history. Export an index with API examples.
Claim C01 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## C02: macOS capture core

```text
Execute only C02 in ferby-shottr. Agent: codex.
Read AGENTS.md and the completion protocol. Inputs: docs/implementation/ARCHITECTURE.md.
Own only: src-tauri/crates/capture-core/**.
Create standalone ferby-capture-core Rust library. Define mode/result/error types and an injectable command runner. Use a fixed /usr/sbin/screencapture executable with explicit arguments, internally generated output paths and cleanup on cancellation/failure. Clearly reject unsupported platforms. No actual screen capture in tests.
Cargo tests cover command arguments, path safety, cancel/permission/failure classification with fake runner, and cleanup. Do not change the root Cargo manifest or Tauri registrations.
Claim C02 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## C03: Image transform and export core

```text
Execute only C03 in ferby-shottr. Agent: codex.
Read AGENTS.md and the completion protocol. Inputs: docs/implementation/ARCHITECTURE.md.
Own only: src-tauri/crates/image-core/**.
Create standalone ferby-image-core Rust library for bounded image decoding, crop, aspect-preserving resize and PNG/JPEG encoding. Choose documented library APIs from primary sources. Keep input immutable, validate dimensions/overflow and avoid overwriting existing outputs.
Cargo tests use synthetic pixels for exact crop dimensions/colors, invalid/out-of-bounds/zero/overflow cases, resize aspect ratio and decoded output headers. Own dependencies and lockfile stay inside this crate.
Claim C03 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## C04: Review and integrate available modules

```text
Execute only C04 in ferby-shottr. Agent: codex.
Read AGENTS.md and the completion protocol. Inputs: coordination/reviews/INDEX.md.
Own only: src/Workspace.*; src/platform/**; src-tauri/src/**; root manifests/configs/lockfiles.
Refresh review inbox. Review available packets against actual code/tests and record approved/changes_requested decisions. Integrate only reviewed modules through frozen contracts and typed Tauri commands. Keep native work off the UI thread, use constrained capabilities, and do not pretend pending modules are functional.
Run relevant frontend tests/build and Rust checks plus meaningful IPC tests. If modules are absent, record partial and proceed to C05 without polling. Never approve a stale snapshot.
Claim C04 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## C05: Foundation regression and native boundary hardening

```text
Execute only C05 in ferby-shottr. Agent: codex.
Read AGENTS.md and the completion protocol. Inputs: src/Workspace.tsx; src/platform/import-image.ts; tests/e2e/workspace.spec.ts.
Own only: tests/e2e/codex-regressions.spec.ts; src/platform/**; src-tauri/src/**.
Add bounded regression coverage for baseline multi-image selection/close/reimport/error recovery and inspect the native command boundary. Fix actual defects only in Codex-owned files. Check capability/CSP scope and document native-vs-browser coverage honestly.
Run targeted E2E and Rust command tests/build. No capture, cloud, telemetry or permission changes. Preserve unfinished worker files.
Claim C05 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```
