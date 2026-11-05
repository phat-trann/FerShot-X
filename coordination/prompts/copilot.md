# Copilot implementation prompts

Use the dispatcher prompt once to execute the queue, or paste a single task prompt for bounded work. Open the same local `ferby-shottr` checkout.

## Queue dispatcher

```text
Work in /Users/phattran/Documents/Code/Personal/ferby-shottr/ as copilot.
The user selected Tauri 2 + Rust; the React/TypeScript foundation already exists.
Read AGENTS.md, coordination/reviews/README.md and only your rows in
coordination/BUILD-QUEUE.md. Read frozen contracts named by each task.
Execute P01, P02, P03, P04, P05 in order within their owned paths.
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

## P01: Color formatting utilities

```text
Execute only P01 in ferby-shottr. Agent: copilot.
Read AGENTS.md and the completion protocol. Inputs: No full evidence required.
Own only: src/features/color/**.
Implement rgbToHex and hexToRgb for integer RGB channels and #RGB/#RRGGBB. Validate ranges and reject unsupported alpha/malformed input. Pure functions only.
At most 2 implementation/test files; test boundaries, round trips and invalid input. Run targeted Vitest. Summary at most 150 words.
Claim P01 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## P02: Measurement utilities

```text
Execute only P02 in ferby-shottr. Agent: copilot.
Read AGENTS.md and the completion protocol. Inputs: src/contracts/editor.ts.
Own only: src/features/measurement/**.
Implement normalizeRect, clampPointToImage and pixelsToPoints using explicit positive display scale. Use image-pixel coordinates and reject non-finite/invalid dimensions. No display API or UI.
At most 2 implementation/test files; test reverse drag, bounds, 1x/2x scaling and invalid inputs. Run targeted Vitest. Summary at most 150 words.
Claim P02 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## P03: Editor shortcut matching

```text
Execute only P03 in ferby-shottr. Agent: copilot.
Read AGENTS.md and the completion protocol. Inputs: src/contracts/editor.ts.
Own only: src/features/shortcuts/**.
Define small editor tool key descriptors and a pure matcher returning an AnnotationTool or null. Ignore input/contenteditable focus, composition, repeats and unexpected modifiers. Do not register global listeners or OS shortcuts.
At most 2 implementation/test files; test text-input safety, composition/repeats and modifier cases. Run targeted Vitest. Summary at most 150 words.
Claim P03 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## P04: Export filename utilities

```text
Execute only P04 in ferby-shottr. Agent: copilot.
Read AGENTS.md and the completion protocol. Inputs: No full evidence required.
Own only: src/features/export/names.ts; src/features/export/names.test.ts.
Implement a pure safeExportName utility for PNG/JPEG: sanitize path separators/control characters, reject empty/dot-only names, normalize extension and bound filename length while preserving reasonable Unicode. No disk IO or overwrite behavior.
Only named files; test traversal-like names, duplicate extensions, Unicode, long names and invalid cases. Run targeted Vitest. Summary at most 150 words.
Claim P04 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## P05: Bounded baseline accessibility review

```text
Execute only P05 in ferby-shottr. Agent: copilot.
Read AGENTS.md and the completion protocol. Inputs: src/Workspace.tsx; src/Workspace.css.
Own only: docs/qa/copilot-P05.md.
Review only the runnable baseline for accessible names, focus order, disabled/error states, image alt text and narrow-window behavior. Do not scan the whole repo or modify product code.
Report at most 5 actionable findings with file/line, severity, evidence and proposed fix, at most 250 words. Separate static findings from browser-tested facts.
Claim P05 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```
