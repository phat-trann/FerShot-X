# Run three agents together

Open `/Users/phattran/Documents/Code/Personal/ferby-shottr/` locally in each client. Use one kickoff prompt per client. This file does not start or notify another client automatically.

| Client | Relative budget | Scope | Initial activity |
| --- | --- | --- | --- |
| Codex | Largest | T03 editor, T04 pin/library, T07 settings/sharing; T06 integration | Static investigation while Antigravity uses the UI |
| Antigravity | Medium | T02 capture, scrolling, OCR/QR | Synthetic fixtures and first UI slot |
| GitHub Copilot | Smallest | T05, four static feature groups | Compact evidence audit; no REA connection needed |

The allocation follows the user's available budgets, not a model ranking or a quota setting. All three may read artifacts and write their own reports concurrently. The shared `runtime-shottr` claim serializes interactive work on the same Shottr instance.

## Codex kickoff prompt

```text
Work in /Users/phattran/Documents/Code/Personal/ferby-shottr/.
Read AGENTS.md, coordination/PROTOCOL.md, coordination/BOARD.md,
docs/phase-1-features.md and the T01 handoff. Respect existing claims.

You own the largest scope and integration. Claim T03 first: use REA and
existing evidence to investigate editor/annotations, concealment, crop,
resize, backdrop, measurements and colors (F06-F19). Read selected records;
do not rerun the initial collector. Start static work immediately so
Antigravity can use the first runtime-shottr slot. Acquire that claim
before UI work and use synthetic images only.

After handing off T03, claim T04 and T07 separately if useful independent
work remains. Do not duplicate Antigravity T02 or Copilot T05. Write each
report under docs/agents/codex/ and each handoff under
coordination/handoffs/codex/. As integrator, review available handoffs and
merge supported findings as T06; leave absent results pending, no polling.
Only you edit BOARD.md and the consolidated report. Cite evidence and
limitations; distinguish static observations from runtime verification.
Do not install engines, change preferences, upload, activate licenses or
implement a replacement app. Report actual blockers and unknowns.
```

## Antigravity kickoff prompt

```text
Work in /Users/phattran/Documents/Code/Personal/ferby-shottr/.
Read AGENTS.md, coordination/PROTOCOL.md and BOARD.md. Claim only T02.
Review F01-F04 in docs/phase-1-features.md and selected existing evidence
for UI-03/UI-10/UI-12/UI-15/UI-16; do not load the whole raw graph.

Use REA to investigate fullscreen/area/window/repeat capture, scrolling,
OCR and QR with synthetic fixtures. Prepare fixtures, then acquire the
runtime-shottr claim for the first UI slot. Respect other owners. Do not
read private screenshots or change preferences. If runtime tools or
permissions block testing, record the blocker and leave behavior UNKNOWN;
do not install software or repeat setup.

Write docs/agents/antigravity/T02-capture-ocr.md, at most 800 words:
result table, evidence paths and remaining questions. Save a handoff under
coordination/handoffs/antigravity/, release owned claims after cleanup,
and leave a message for Codex. Do not edit shared reports or the board.
Stop after T02; no polling or unrelated investigation.
```

## GitHub Copilot kickoff prompt

```text
Work locally in /Users/phattran/Documents/Code/Personal/ferby-shottr/.
Read AGENTS.md, coordination/PROTOCOL.md, the T05 board row,
coordination/briefs/COPILOT-T05.md and evidence/briefs/copilot-export.json.
Claim only T05. Audit F05/F24/F25/F32 from this compact REA-derived input.
No MCP calls, app launch, web search, full inventory or repository scan.
Write docs/agents/copilot/T05-export-audit.md: four evidence-backed rows
and four proposed tests, at most 350 words. Save a handoff of at most
120 words under coordination/handoffs/copilot/. Mark runtime UNKNOWN,
leave shared files untouched, release your task claim, then stop.
```

## Additional setup

For T05, Copilot needs only a signed-in local agent session with file-reading/editing tools. It uses already exported REA observations; this does not mean Copilot itself ran REA. No new engine, orchestrator, shared MCP listener or Node version is required.

During this planning update, no Copilot entries were found in the default `~/.vscode/extensions` location/manifest, and the default VS Code user `mcp.json` was empty. Another profile or installation may differ. If Copilot is not available in your intended client, install the official GitHub Copilot integration through its extension UI and sign in. Use a local session: a cloud coding agent cannot directly read this Mac's `/Applications/Shottr.app`.

If Copilot later needs fresh REA calls, configure the matching integration: `--client vscode` for VS Code, `--client copilot_cli` for Copilot CLI. These target different configuration files. See [REA client configuration](https://github.com/morluto/rea/blob/main/docs/client-configuration.md#vs-code) and [VS Code MCP configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration). The current static audit needs none of REA's 229 tool definitions enabled.

Preview VS Code setup using the supported runtime:

```sh
rtk proxy zsh -lc 'source "$HOME/.nvm/nvm.sh"; nvm use 26.13.0; npx --yes rea-agents@6.8.0 setup --client vscode --dry-run --format json'
```

Review exact paths, backups and skill changes before applying a requested setup. Keep Node 26 available to REA without changing the global Node 8 default. REA targets the default VS Code profile; named profiles may need their own registration. Use `MCP: List Servers` in the intended profile to inspect/start REA and verify an actual call. No Copilot installation or MCP configuration change was applied by this planning update.
