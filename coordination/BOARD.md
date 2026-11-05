# Agent coordination board

Integrator: **Codex**. Last updated: 2026-11-05, Asia/Ho_Chi_Minh.

**Active product work:** [Tauri/Rust build queue](BUILD-QUEUE.md) · [three role prompt queues](START-HERE.md) · [Codex review inbox](reviews/INDEX.md). Every request must publish a completion packet; see [the protocol](reviews/README.md). C00 supplies the application foundation; the table below retains research history.

Only the integrator edits this index. Actual claims and per-task handoffs are authoritative; a suggested agent is not a running process or accepted assignment.

| Task | Status | Owner | Scope and output | Dependencies |
| --- | --- | --- | --- | --- |
| T01 | DONE | Codex | Static REA inventory, target identity, Phase 1 report, Git and coordination setup | None |
| T02 | DONE (static; runtime blocked) | Antigravity | Capture modes, scrolling, OCR and QR (F01-F04); `docs/agents/antigravity/T02-capture-ocr.md` | Handoff received; REA observation returned Screen Recording/Accessibility denied; runtime UNKNOWN |
| T03 | PARTIAL | Codex (static pass complete) | Editor, annotations, concealment, backdrop, measurements (F06-F19); `docs/agents/codex/T03-editor.md` | Start static work immediately; runtime claim for UI |
| T04 | PARTIAL | Codex (static pass complete) | Pin, library and preview (F20-F23); `docs/agents/codex/T04-pin-library.md` | Claim after T03; runtime claim for UI; no private screenshot history |
| T05 | DONE (static) | GitHub Copilot; reviewed by Codex | F05/F24/F25/F32 findings accepted; `docs/agents/copilot/T05-export-audit.md` | One relative link correction and proposed-test scope notes sent to author; runtime UNKNOWN |
| T06 | PARTIAL | Codex as integrator | Available static findings integrated; `docs/integration-review.md` | T02 handoff and T03/T04 runtime obligations remain open; no polling |
| T07 | DONE (static) | Codex | Window capture, cloud/S3, shortcuts, settings, license and diagnostics (F26-F34 except F32); `docs/agents/codex/T07-settings-sharing.md` | Static review first; no cloud tests, license actions or preference changes |

Claims and handoffs are authoritative. Codex completed this static pass and released its claims; Antigravity T02 subsequently handed off static findings and OS permission failures. The user has now requested implementation with Tauri + Rust; product work is in the separate build queue. See [the three kickoff prompts](START-HERE.md). The split follows the user's budgets: Codex largest, Antigravity medium, Copilot smallest. DONE (static) does not mean runtime behavior was verified.

## Current handoffs

- [Codex T01](handoffs/codex/T01-static-inventory.md): completed observations, limitations and next-agent instructions.
- [Codex T03](handoffs/codex/T03-editor.md): static editor mapping complete; runtime/native bodies unresolved.
- [Codex T04](handoffs/codex/T04-pin-library.md): static pin/library/preview mapping complete; runtime unresolved.
- [Codex T07](handoffs/codex/T07-settings-sharing.md): static settings/sharing review complete.
- [Codex T06](handoffs/codex/T06-integration.md): integration checkpoint and pending obligations.
- [Copilot T05](handoffs/copilot/T05-export-audit.md): DONE static audit, accepted with [review notes](messages/copilot/2026-11-05-codex-T05-review.md).
- [Antigravity T02](handoffs/antigravity/T02-capture-ocr.md): static findings complete; actual REA UI observation attempts were blocked by macOS permissions.

## Messages

Use `coordination/messages/<recipient>/<timestamp>-<sender>-<task>.md` for a durable message. Recipient values may be `codex`, `antigravity`, `copilot` or `all`. Each message is a new file with one author. These files do not send notifications or trigger another client.
