# Codex implementation prompts

> Latest user allocation: Codex also executes free A01-A37 producer/fix scopes as codex; Copilot owns P58-P63 independent bounded tests. See TWO-LANE.md. No self-approval.

> Staffing update: read [TWO-LANE.md](../TWO-LANE.md) first. Antigravity is unavailable this week. Review current A34-A37/P51-P56, then continue reviewed integration when existing shared claims are released; preserve pending independent signoff.


Use the dispatcher prompt once to execute the queue, or paste a single task prompt for bounded work. Open the same local `ferby-shottr` checkout.

## Validation ownership

Do not run/fix formatting, lint, cargo fmt/clippy or git diff --check. Delegate hygiene to Copilot H01. Own functional review/tests and integration typecheck/build. Do not request cosmetic/lint-only fixes from Antigravity. Record delegated checks without blocking progress.

## Queue dispatcher

```text
Work in /Users/phattran/Documents/Code/Personal/ferby-shottr/ as codex.
Read AGENTS.md, coordination/DELIVERY-PLAN.md and coordination/CONTINUOUS.md. Active queue: C01-C22; preserve completed C01-C03/C05/C06. Implement C17-C22 independently before review/integration backlog.
Run rtk proxy python3 scripts/next_task.py --agent codex --claim.
Read only the selected task's named inputs/section, not the entire task catalogue.
Execute its returned action: functional fix, checked snapshot refresh, or new task.
Skip current submitted work, occupied claims and missing prerequisites; no polling.
Only reviewed modules may be integrated. Own shared contracts/native/app wiring and integration builds; no formatting/lint. Update accepted progress gates with evidence.
Read coordination/ORIGIN-PARITY.md. Review source-grounded case packs and composed A34-A37 modules as available.
Treat STATIC_OBSERVED and Ferby-only tests separately from original runtime parity. No Swift.
Do not spend every turn on C04 while independent C17-C22 work is available.
Antigravity reviews Codex implementation snapshots through peer_review.py; no self-approval.
After EACH task/request, submit a completion packet with exact current files,
actual checks and limitations. Release ALL returned claims, then immediately
select the next available task without waiting for review or native wiring.
Stay at 0.1.0 and frozen dependency versions. Do not change another role's scope.
Stop only when the available queue is exhausted or the client session ends;
persist results so the same dispatcher resumes without repeating completed work.
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
Run relevant frontend tests/build and Rust functional tests plus meaningful IPC tests. If modules are absent, record partial and proceed to C05 without polling. Never approve a stale snapshot.
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

## Continuous dispatch (supersedes earlier fixed queue ranges)

Read coordination/CONTINUOUS.md, then run `rtk proxy python3 scripts/next_task.py --agent codex`. Select one task using current packet/claim state, not stale table labels. Use `--claim` to claim a selected task atomically. Fix functional reviews first, then implement independently, then review and integrate approved inputs. Submitted-current work is skipped until a new review request arrives. No polling, waiting, OS privacy changes or version upgrades. Stop only when all available tasks are submitted or blocked; save one completion packet per task/request.

## C07: Editor and raster-export integration

```text
Execute C07 as codex in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: A04/A06/A07/A08/A10.
Own only: src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts.
Use Rust native integration only; never compile/run the historical Swift prototype. Review current packets and actual functionality first; integrate only approved module APIs, typed main-window IPC and constrained native capabilities. Keep heavy work off UI thread. Stay at 0.1.0 and existing versions; no telemetry/upload/license gates. Preserve originals and never invoke OS actions in automated tests without injected fakes.
Acceptance: Scoped functional/IPC/browser checks and integration build. Separate browser/fake validation from real native acceptance. Native acceptance uses explicit user-triggered synthetic scenarios; no automatic privacy changes. Missing modules -> partial, skip and continue.
Validation policy: Functional review/tests and integration build; no formatting/lint.
Prerequisites: requires the named local exports; skip if absent. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## C08: Native clipboard import and local OCR bridge

```text
Execute C08 as codex in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: A33 Rust Vision / A14 and P23/P24.
Own only: src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts.
Use Rust native integration only; never compile/run the historical Swift prototype. Review current packets and actual functionality first; integrate only approved module APIs, typed main-window IPC and constrained native capabilities. Keep heavy work off UI thread. Stay at 0.1.0 and existing versions; no telemetry/upload/license gates. Preserve originals and never invoke OS actions in automated tests without injected fakes.
Acceptance: Scoped functional/IPC/browser checks and integration build. Separate browser/fake validation from real native acceptance. Native acceptance uses explicit user-triggered synthetic scenarios; no automatic privacy changes. Missing modules -> partial, skip and continue.
Validation policy: Functional review/tests and integration build; no formatting/lint.
Prerequisites: requires the named local exports; skip if absent. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## C09: Restricted pin/preview windows

```text
Execute C09 as codex in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: A05/A15/P10/P39.
Own only: src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts; src/App.tsx.
Use Rust native integration only; never compile/run the historical Swift prototype. Review current packets and actual functionality first; integrate only approved module APIs, typed main-window IPC and constrained native capabilities. Keep heavy work off UI thread. Stay at 0.1.0 and existing versions; no telemetry/upload/license gates. Preserve originals and never invoke OS actions in automated tests without injected fakes.
Acceptance: Scoped functional/IPC/browser checks and integration build. Separate browser/fake validation from real native acceptance. Native acceptance uses explicit user-triggered synthetic scenarios; no automatic privacy changes. Missing modules -> partial, skip and continue.
Validation policy: Functional review/tests and integration build; no formatting/lint.
Prerequisites: requires the named local exports; skip if absent. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## C10: Settings persistence and actual preference effects

```text
Execute C10 as codex in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: A03/A09/A24/A28/P08.
Own only: src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts.
Use Rust native integration only; never compile/run the historical Swift prototype. Review current packets and actual functionality first; integrate only approved module APIs, typed main-window IPC and constrained native capabilities. Keep heavy work off UI thread. Stay at 0.1.0 and existing versions; no telemetry/upload/license gates. Preserve originals and never invoke OS actions in automated tests without injected fakes.
Acceptance: Scoped functional/IPC/browser checks and integration build. Separate browser/fake validation from real native acceptance. Native acceptance uses explicit user-triggered synthetic scenarios; no automatic privacy changes. Missing modules -> partial, skip and continue.
Validation policy: Functional review/tests and integration build; no formatting/lint.
Prerequisites: requires the named local exports; skip if absent. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## C11: User-triggered scrolling and capture modes

```text
Execute C11 as codex in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: A22/A23/P30/P34.
Own only: src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts.
Use Rust native integration only; never compile/run the historical Swift prototype. Review current packets and actual functionality first; integrate only approved module APIs, typed main-window IPC and constrained native capabilities. Keep heavy work off UI thread. Stay at 0.1.0 and existing versions; no telemetry/upload/license gates. Preserve originals and never invoke OS actions in automated tests without injected fakes.
Acceptance: Scoped functional/IPC/browser checks and integration build. Separate browser/fake validation from real native acceptance. Native acceptance uses explicit user-triggered synthetic scenarios; no automatic privacy changes. Missing modules -> partial, skip and continue.
Validation policy: Functional review/tests and integration build; no formatting/lint.
Prerequisites: requires the named local exports; skip if absent. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## C12: Annotation/effect/backdrop/composition integration

```text
Execute C12 as codex in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: A16-A21/A26/A27.
Own only: src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts.
Use Rust native integration only; never compile/run the historical Swift prototype. Review current packets and actual functionality first; integrate only approved module APIs, typed main-window IPC and constrained native capabilities. Keep heavy work off UI thread. Stay at 0.1.0 and existing versions; no telemetry/upload/license gates. Preserve originals and never invoke OS actions in automated tests without injected fakes.
Acceptance: Scoped functional/IPC/browser checks and integration build. Separate browser/fake validation from real native acceptance. Native acceptance uses explicit user-triggered synthetic scenarios; no automatic privacy changes. Missing modules -> partial, skip and continue.
Validation policy: Functional review/tests and integration build; no formatting/lint.
Prerequisites: requires the named local exports; skip if absent. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## C13: Global shortcut and app lifecycle wiring

```text
Execute C13 as codex in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: A25/A28.
Own only: src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts.
Use Rust native integration only; never compile/run the historical Swift prototype. Review current packets and actual functionality first; integrate only approved module APIs, typed main-window IPC and constrained native capabilities. Keep heavy work off UI thread. Stay at 0.1.0 and existing versions; no telemetry/upload/license gates. Preserve originals and never invoke OS actions in automated tests without injected fakes.
Acceptance: Scoped functional/IPC/browser checks and integration build. Separate browser/fake validation from real native acceptance. Native acceptance uses explicit user-triggered synthetic scenarios; no automatic privacy changes. Missing modules -> partial, skip and continue.
Validation policy: Functional review/tests and integration build; no formatting/lint.
Prerequisites: requires the named local exports; skip if absent. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## C14: Explicit local archive integration

```text
Execute C14 as codex in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: A29.
Own only: src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts.
Use Rust native integration only; never compile/run the historical Swift prototype. Review current packets and actual functionality first; integrate only approved module APIs, typed main-window IPC and constrained native capabilities. Keep heavy work off UI thread. Stay at 0.1.0 and existing versions; no telemetry/upload/license gates. Preserve originals and never invoke OS actions in automated tests without injected fakes.
Acceptance: Scoped functional/IPC/browser checks and integration build. Separate browser/fake validation from real native acceptance. Native acceptance uses explicit user-triggered synthetic scenarios; no automatic privacy changes. Missing modules -> partial, skip and continue.
Validation policy: Functional review/tests and integration build; no formatting/lint.
Prerequisites: requires the named local exports; skip if absent. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## C15: Deep links, print and user-initiated drag

```text
Execute C15 as codex in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: A30/P37/P40.
Own only: src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts.
Use Rust native integration only; never compile/run the historical Swift prototype. Review current packets and actual functionality first; integrate only approved module APIs, typed main-window IPC and constrained native capabilities. Keep heavy work off UI thread. Stay at 0.1.0 and existing versions; no telemetry/upload/license gates. Preserve originals and never invoke OS actions in automated tests without injected fakes.
Acceptance: Scoped functional/IPC/browser checks and integration build. Separate browser/fake validation from real native acceptance. Native acceptance uses explicit user-triggered synthetic scenarios; no automatic privacy changes. Missing modules -> partial, skip and continue.
Validation policy: Functional review/tests and integration build; no formatting/lint.
Prerequisites: requires the named local exports; skip if absent. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## C16: Functional parity acceptance and release gate

```text
Execute C16 as codex in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: all feature-map owners.
Own only: src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts.
Use Rust native integration only; never compile/run the historical Swift prototype. Review current packets and actual functionality first; integrate only approved module APIs, typed main-window IPC and constrained native capabilities. Keep heavy work off UI thread. Stay at 0.1.0 and existing versions; no telemetry/upload/license gates. Preserve originals and never invoke OS actions in automated tests without injected fakes.
Acceptance: Scoped functional/IPC/browser checks and integration build. Separate browser/fake validation from real native acceptance. Native acceptance uses explicit user-triggered synthetic scenarios; no automatic privacy changes. Missing modules -> partial, skip and continue.
Validation policy: Functional review/tests and integration build; no formatting/lint.
Prerequisites: requires the named local exports; skip if absent. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## C17: Capture session controller

Inputs: src/contracts/media.ts; src/features/stitch-budget/index.ts.

Own only: `src/features/capture-session/**`.

Implement a headless capture-session controller with injected frame acquisition and stitching adapters, explicit user-start, stop/cancel, monotonic operation IDs, bounded frame count/bytes/pixels, repeat-area state bound to explicit display geometry and invalidation on display change. Manual frames and an injected scheduler only; no real screenshot, scrolling, global listener or OS calls. Own local request/state types and integration example for C11; do not rewrite capture-core or A22 stitcher.

Acceptance: Deferred fake frame/stitch promises prove stale result rejection after stop/new session, duplicate-stop safety, budget failure cleanup, stable frame order and repeat-area invalidation. Tests use synthetic frames and no timers that wait in real time.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional tests; Codex may run necessary type/build checks. Formatting/lint delegated to Copilot H01. No Swift.

## C18: Recognition job controller

Inputs: src/features/ocr-panel/index.ts; src/features/qr-panel/index.ts.

Own only: `src/features/recognition-workflow/**`.

Implement an injected async OCR/QR controller independent of the native Vision crate: validate owned request bounds, selected image identity, allowed runtime languages, operation generation, cancellation and bounded output. Preserve raw recognized text and return display-normalization separately. QR values stay inert data; never auto-open a URL or write clipboard. Export typed adapter proposal for C08; do not change native.ts/contracts or worker panels.

Acceptance: Fake backend tests cover overlapping requests completing out of order, closing image mid-request, language discovery errors, invalid/oversize payloads, empty result and rejection recovery; output remains associated with exact source and no duplicate callbacks.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional tests; Codex may run necessary type/build checks. Formatting/lint delegated to Copilot H01. No Swift.

## C19: Output job orchestration

Inputs: src/contracts/media.ts; src/features/export/names.ts.

Own only: `src/features/output-jobs/**`.

Implement a headless output job coordinator with injected render/copy/save/print/drag handlers and explicit user intent. Freeze document revision and export options at start, limit concurrent jobs, manage temporary raster lifetime, suppress duplicate actions, preserve user cancellation and original image on failure. No actual clipboard, disk, dialogs, OS print/drag or native registration. Export integration examples for C07/C15; do not replace existing name or output-size helpers.

Acceptance: Injected deferred-handler tests prove exact-once cleanup on success/failure/cancel, unchanged original, stale source isolation, frozen format/quality and no duplicate save/print requests. Distinguish partial success from retryable failure without repeating a completed side effect.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional tests; Codex may run necessary type/build checks. Formatting/lint delegated to Copilot H01. No Swift.

## C20: Local archive workflow controller

Inputs: src/contracts/media.ts; src/features/session-selection/index.ts.

Own only: `src/features/archive-workflow/**`.

Implement staged archive import/export workflow with injected bounded decoder/encoder and user-approved IO callbacks. Validate metadata/count/aggregate budgets before committing a candidate library, preserve old library on any invalid entry or cancellation, release owned object URLs exactly once and produce a deterministic ID-collision remap proposal. Do not implement ZIP parsing, touch disk, edit A29 session-core, serialize URLs as image content or rewrite the root session library.

Acceptance: Synthetic archive tests cover mixed-validity atomic rejection, conflicting IDs, cancellation/late decoder results, resource cleanup, immutable snapshots and preserving active document/annotations. Document native A29 adapter and C14 integration obligations.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional tests; Codex may run necessary type/build checks. Formatting/lint delegated to Copilot H01. No Swift.

## C21: Application lifecycle and action policy

Inputs: src/features/deep-link-parser/index.ts; src/features/shortcuts/editor-shortcuts.ts.

Own only: `src/features/lifecycle-policy/**`.

Implement pure application action arbitration for explicit allowed hotkey/deep-link intents, busy/closing state, editable focus, duplicate activation and unsaved-document decisions. Emit declarative effects only through injected handlers; never register OS shortcuts, launch URLs, start captures, persist preferences or alter global state. Fail closed on malformed/unknown intents, separate caller-specified preferences from platform capabilities and expose local integration example for C13/C15.

Acceptance: Table-driven functional cases cover repeated intent IDs, busy state, editable focus, close/save/cancel transitions, unrecognized routes, unsupported capabilities and no destructive action before an explicit confirmation decision. No global listeners or OS state changes.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional tests; Codex may run necessary type/build checks. Formatting/lint delegated to Copilot H01. No Swift.

## C22: Bounded native image effects pipeline

Inputs: src-tauri/crates/image-core/src/lib.rs; src-tauri/crates/effects-core/src/lib.rs.

Own only: `src-tauri/crates/effects-pipeline/**`.

Implement standalone Rust orchestration crate reusing image-core and A19 effects-core through owned adapters. Validate ordered effect requests and aggregate decode/output/work budgets, decode once where APIs permit, preserve immutable source, return owned encoded output and typed errors. No new blur/erase algorithm, native command registration, root manifest edits, Swift or dependency version changes. Use only existing dependency versions and path dependencies; propose root adapter for C12.

Acceptance: Synthetic pixel tests cover ordering of mixed effects, transparent inputs, out-of-bounds regions, malformed images, pixel/output budgets, failure preserving original and deterministic bounded results. Tests call no OS APIs; do not claim target concealment algorithm or privacy equivalence.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional tests; Codex may run necessary type/build checks. Formatting/lint delegated to Copilot H01. No Swift.

Final C16 must produce coordination/release/input-manifest.json with exact individual candidate file hashes and feature/test evidence references, and snapshot those files in its packet. P57 consumes this bounded input only after Antigravity reviews current completed C16. Do not mark unexecuted native gates accepted.
