# COORD02 allocation and project progress

Request: BUILD-20261105. Date: 2026-11-05. Status: DONE for planning/progress infrastructure.

Read the current AGENTS.md updates: prefer established libraries, defer uploads/FTP and keep all Ferby features unlocked. Clarified that this applies to Ferby and does not authorize modifying Shottr.app. Preserved worker implementation files.

## Allocation

- Antigravity: fix/currently snapshot A01-A04; A05 controlled presentation already accepted. Added A06 toolbar, A07 composed editor, A08 real bitmap renderer, A09 standalone Rust settings persistence and A10 export options. A09 explicitly owns its nested Cargo manifest/lockfile; native root registration stays Codex-owned.
- Copilot: fix P02 overflow and P05 false-positive audit findings; P01/P03/P04 already accepted. Added P06 fit helper, P07 crop validator, P08 settings codec, P09 public history regressions, P10 pin values and P11 native manual checklist. Each scope is bounded to one/two files and named inputs.
- Codex: shared boundary review and wiring only. C01-C03 and C05 assigned scopes complete; C04 remains partial. No waiting/polling or automatic cross-client execution.

Updated kickoff prompts, machine-readable queue and ownership table. A08 owns exactly one Playwright test in the discovered E2E directory; P09 owns one test under src/testing so Vitest discovers it without a root config change. All new work is independent except A07's explicit toolbar export prerequisite; unavailable tasks are skipped.

## Progress baseline

`coordination/progress.json` is a manually accepted, evidence-linked gate ledger. `scripts/project_progress.py` validates weights/IDs/booleans/evidence paths and renders `coordination/PROGRESS.md`; --check detects stale output. Current score: 43.75% (about 44%) of the declared macOS MVP v0.1. Ten weighted milestones, four equal gates per milestone. Native/manual acceptance remains unchecked. These weights are planning judgments, not a measured estimate of remaining hours or full Shottr parity. Scrolling/advanced tools remain outside this MVP baseline, not cancelled project goals.

## Validation and handoff

- Validated 26 unique task definitions (C00 foundation is separately documented), prompt ownership parity, source links and deterministic weighted progress output.
- Review workflow: 5 Python tests passed; git diff --check passed; ignored .vscode/raw/captures/artifacts/node_modules/Rust outputs confirmed.
- Completed inherited C05 validation: 51 frontend unit tests, 6 browser E2E tests, 6 root Rust tests, strict root clippy and sequential debug app bundle build passed. See C05 packet/report for mock/native limits.
- Current rule packet was reviewed; later Codex scope clarification naturally supersedes that file snapshot. No worker module became approved merely because its tests passed.
- The user must paste the updated prompts into Antigravity/Copilot; repository files neither launch nor notify external clients. No additional dependencies were needed for this coordination change.
