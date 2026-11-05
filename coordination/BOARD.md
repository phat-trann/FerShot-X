# Agent coordination board

Integrator: **Codex**. Last updated: 2026-11-05, Asia/Ho_Chi_Minh.

Only the integrator edits this index. Actual claims and per-task handoffs are authoritative; a suggested agent is not a running process or accepted assignment.

| Task | Status | Owner | Scope and output | Dependencies |
| --- | --- | --- | --- | --- |
| T01 | DONE | Codex | Static REA inventory, target identity, Phase 1 report, Git and coordination setup | None |
| T02 | READY | Unassigned; suggested Antigravity | Verify capture modes, scrolling, OCR and QR (F01-F04); `docs/agents/antigravity/T02-capture-ocr.md` | Runtime claim; synthetic fixture/window |
| T03 | READY | Unassigned; suggested Codex | Verify annotations, erase/blur, composition and measurements (F06-F19); `docs/agents/codex/T03-editor.md` | Runtime claim; synthetic image |
| T04 | READY | Unassigned | Verify pin, library and preview (F20-F23); task-specific report in owner's directory | Runtime claim; isolated fixtures; do not index private screenshot history |
| T05 | READY | Unassigned | Verify local import/export and document cloud/deep-link unknowns (F05, F24-F32); no uploads or preference changes | Runtime claim for UI; scope confirmation before any external side effects |
| T06 | WAITING | Codex as integrator | Merge reviewed findings into feature matrix; retain disagreements and evidence | Handoffs from the relevant tasks |

T02-T05 are a proposed queue, not evidence that Antigravity or any other agent has started. Phase 1 is complete; the user has not requested implementation of a new app.

## Current handoffs

- [Codex T01](handoffs/codex/T01-static-inventory.md): completed observations, limitations and next-agent instructions.
- Antigravity: no task claimed or handoff received at initialization.

## Messages

Use `coordination/messages/<recipient>/<timestamp>-<sender>-<task>.md` for a durable message. Recipient values may be `codex`, `antigravity` or `all`. Each message is a new file with one author. These files do not send notifications or trigger another client.
