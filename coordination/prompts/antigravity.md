# Antigravity implementation prompts

Use the dispatcher prompt once to execute the queue, or paste a single task prompt for bounded work. Open the same local `ferby-shottr` checkout.

## Queue dispatcher

```text
Work in /Users/phattran/Documents/Code/Personal/ferby-shottr/ as antigravity.
The user selected Tauri 2 + Rust; the React/TypeScript foundation already exists.
Read AGENTS.md, coordination/reviews/README.md and only your rows in
coordination/BUILD-QUEUE.md. Read frozen contracts named by each task.
Execute A01, A02, A03, A04, A05 in order within their owned paths.
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

## A01: Capture panel

```text
Execute only A01 in ferby-shottr. Agent: antigravity.
Read AGENTS.md and the completion protocol. Inputs: src/contracts/media.ts.
Own only: src/features/capture/**.
Implement CapturePanel.tsx and scoped CSS using CapturePanelProps: fullscreen/area/window actions, busy/error states, keyboard focus and accessible names. Buttons call onCapture only. No native invoke, root wiring, global shortcuts or real capture.
Use React Testing Library tests with jsdom for callback mode values, disabled/busy behavior and announced errors. Keep fixtures synthetic; report that native behavior is unwired.
Claim A01 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## A02: Session library panel

```text
Execute only A02 in ferby-shottr. Agent: antigravity.
Read AGENTS.md and the completion protocol. Inputs: src/contracts/media.ts.
Own only: src/features/library/**.
Implement LibraryPanel.tsx using LibraryPanelProps. Add local query filtering, selection, remove affordance, list/grid presentation and empty/no-match states. Operate only on provided images; no filesystem/database access or root wiring.
Test query/selection/removal callbacks, selected state, empty results and keyboard operability. Do not revoke parent-owned object URLs.
Claim A02 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## A03: Ferby settings panel

```text
Execute only A03 in ferby-shottr. Agent: antigravity.
Read AGENTS.md and the completion protocol. Inputs: src/contracts/settings.ts.
Own only: src/features/settings/**.
Implement controlled SettingsPanel.tsx for Ferby save format, JPEG quality, downscale and preview preferences. Validate ranges and call onChange with a new value. No persistence, native calls or changes to Shottr preferences.
Test immutable updates, PNG/JPEG quality visibility, bounds and accessible controls. Use only frozen defaults; label unimplemented persistence honestly in the packet.
Claim A03 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## A04: Editor interaction view

```text
Execute only A04 in ferby-shottr. Agent: antigravity.
Read AGENTS.md and the completion protocol. Inputs: src/contracts/editor.ts.
Own only: src/features/editor/view/**.
Implement EditorView.tsx with source-image-coordinate pointer mapping and an SVG/canvas annotation overlay. Support select, rectangle, arrow and pen creation through callbacks, and render supplied annotations. Implement local gesture helpers; do not depend on C01 reducer, mutate annotations or claim export/blur behavior.
Test zoom-to-image coordinate mapping, drag direction, cancellation and out-of-image clamping. Add component behavior tests where practical. Report unsupported tools explicitly; do not modify the shared contract.
Claim A04 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## A05: Pin and preview presentation

```text
Execute only A05 in ferby-shottr. Agent: antigravity.
Read AGENTS.md and the completion protocol. Inputs: src/contracts/media.ts.
Own only: src/features/pin/**.
Create a presentation component for an ImageDocument with scale/opacity controls and edit/copy/close callback props defined locally. Use controlled state/callbacks. No Tauri window creation, clipboard access, persistent storage or always-on-top claims.
Test callback boundaries, scale/opacity limits and accessible labels. Native pin wiring is a Codex integration follow-up, not a blocker to this component.
Claim A05 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```
