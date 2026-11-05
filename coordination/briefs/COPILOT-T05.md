# T05: bounded Copilot audit

Role: smallest context budget. Audit an existing static inventory; do not repeat collection or verify runtime behavior.

## Inputs

Read this brief and `evidence/briefs/copilot-export.json` after the common agent/claim instructions. The JSON is a selected projection of saved REA output, not a complete Evidence record. It includes the target identity, original Evidence IDs, resource paths, archive hashes and selected node IDs.

No full feature report, UI inventory, raw JSON, repository scan or MCP tool discovery is needed.

## Four questions

| Feature | Claim to audit | Check |
| --- | --- | --- |
| F05 | Open File / Open From Clipboard; PNG/JPEG/GIF registered as editable types | Registration does not prove decoding or animated-GIF behavior |
| F24 | Copy Image / Save Image / Save Image As / Print | Check labels/selectors; leave clipboard types and output behavior unknown |
| F25 | Folder choice, Auto PNG/JPEG, PNG, Retina downscale to 1x | Do not invent filenames, quality or auto-format rules |
| F32 | `shottr` URL scheme and Enable deep links | Registration does not prove enabled state or supported URL commands |

## Output

Claim T05 using `coordination/PROTOCOL.md`. Write `docs/agents/copilot/T05-export-audit.md`, at most 350 words: four evidence-backed rows and one proposed runtime test per row. Do not perform those tests.

Write `coordination/handoffs/copilot/T05-export-audit.md`, at most 120 words: status, output path, corrections, unknowns and cleanup/claim state. A completed static audit can be DONE while runtime remains UNKNOWN. For insufficient input, record UNKNOWN and ask Codex one precise question in the handoff.

Write only your own report/handoff and claim. Do not edit the board, shared reports, scripts or other agents' files. No app launch, REA call, install, configuration change, upload, license action or preference change. Release your task claim and stop.
