# Coordination protocol

## Active implementation workflow

The user selected Tauri 2 + Rust. `BUILD-QUEUE.md` and `prompts/codex.md`, `prompts/antigravity.md`, `prompts/copilot.md` now define implementation work. The older Txx investigation procedure below remains valid for research, but its role allocation does not limit product implementation.

Every agent must submit a completion packet to `coordination/reviews/submissions/` before ending each request/task. Follow [the completion protocol](reviews/README.md). Codex alone generates the review inbox and decisions. Submission does not imply approval; file changes make a snapshot stale.

For implementation tasks, use the claim/release commands in that protocol. Work only in the queue's owned paths, submit actual checks and limitations, release, then continue your next independent task. Do not poll for another agent, rerun unchanged blocked work or wait for Codex review before starting an unrelated owned module. No agent may change root dependencies/contracts/wiring to bypass another task's boundary.

## Accept and claim work

1. Read `AGENTS.md`, the board and the latest relevant handoff. Check local Git changes before editing.
2. Choose a READY task, or propose a smaller scope in a message to the integrator.
3. Atomically acquire a local claim. From this repository, first create the claims parent, then use `mkdir` without `-p` for the task itself:

   ```sh
   rtk proxy mkdir -p coordination/claims
   rtk proxy mkdir coordination/claims/T02
   ```

   Only a successful second command acquires the claim. If it already exists, read its owner and contact them; do not remove it or assume it is stale. The claim lives in the shared checkout and is ignored by Git. Separate worktrees require a shared absolute claim location or agreed non-overlapping scopes.

4. Immediately write `coordination/claims/T02/owner.md` with agent/client name, timestamp with timezone, scope, intended files and current activity. Create the task handoff in your own directory with status IN_PROGRESS. The lock must exist before the handoff; do not rely on a board edit for mutual exclusion.
5. For any interactive Shottr control, acquire `coordination/claims/runtime-shottr` in the same way. Static reads need only the task claim. Do not let two agents manipulate the same Shottr windows/clipboard simultaneously.

## Three-agent scheduling and context budget

- Codex owns T03/T04/T07 and integration T06. Read the complete feature matrix and selected evidence; do not reread every raw JSON for each task.
- Antigravity owns T02 only. Plan its UI slot first. Codex starts independent static analysis while Antigravity uses Shottr and takes a UI slot after it is released.
- Copilot owns only T05. Read its brief and compact evidence snapshot. No full UI inventory, raw JSON, repository-wide search, web research or REA tool discovery is needed. Limit output to four feature rows, four proposed tests and a short handoff.
- Output caps constrain report size, not guaranteed total token consumption. No provider quota has been changed.
- Claim the task being worked on, not the whole queue. If runtime-shottr is occupied, do static work. If nothing independent remains, save a PARTIAL handoff and stop; do not poll or remove another agent's claim.
- For missing evidence, record UNKNOWN and ask Codex one precise question. Copilot stops after its bounded audit rather than taking another feature group.

## Work and communicate

- Each report and handoff has one owner. Put reports under `docs/agents/<agent>/` and handoffs under `coordination/handoffs/<agent>/`.
- Send durable messages as new files under `coordination/messages/<recipient>/`. Include From, To, Task, timestamp, request/result, evidence paths and remaining questions. A message file does not automatically reach another running agent.
- Point to saved evidence files, not only another process's retained Evidence IDs. Do not assume both clients share active targets, temporary databases or browser state.
- Keep shared artifacts read-only while another agent uses them. Do not rerun the collector over another task's evidence without coordinating a new run directory.
- Only Codex as integrator edits the board and consolidated Phase 1 report. Other agents send proposed corrections with exact sources.
- Pause UI work and release your runtime claim if another task needs the app. If interrupted unexpectedly, preserve the claim and describe the situation; the next agent must confirm the owner has stopped before reclaiming it.

## Handoff and release

Use this structure for a task handoff:

```markdown
# Txx handoff

Agent: ...
Status: IN_PROGRESS / DONE / PARTIAL / BLOCKED
Updated: ISO timestamp with timezone
Owned files: ...

## Findings

- Feature ID, observation and STATIC_OBSERVED / RUNTIME_VERIFIED / INFERRED / UNKNOWN.
- REA Evidence ID, resource hash or target hash, portable evidence/report path.

## Validation and limitations

Actual checks, incomplete coverage, side effects and cleanup state.

## Next action

Recipient, concrete question and prerequisites.
```

After saving the handoff and confirming owned resources are closed, remove only your own `owner.md`, then your empty claim directory with `rmdir`. Release runtime ownership before the task claim. Send a new message to the integrator. The integrator reviews the evidence and updates the board; no agent should stage or commit another agent's work.

## Environment

REA version for this investigation: 6.8.0. Installed Node for REA: 26.13.0. Preserve the user's global/default Node selection. A supported runtime can be selected in a single shell:

```sh
rtk proxy zsh -lc 'source "$HOME/.nvm/nvm.sh"; nvm use 26.13.0; npx --yes rea-agents@6.8.0 inspect-plist /Applications/Shottr.app --format json'
```

Use the client-connected REA tools when available; a successful CLI call does not prove that a client's current chat has loaded MCP tools.
