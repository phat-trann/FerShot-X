# Agent instructions

## Scope

The user has selected **Tauri 2 + Rust**, with React/TypeScript for the frontend, to build Ferby Shottr. The earlier investigation-only restriction is superseded. Preserve the Shottr investigation as reference; do not invent unknown target behavior or copy proprietary resources/code.

Begin with these instructions, `coordination/BUILD-QUEUE.md` and `coordination/reviews/README.md`, then only the inputs named by your task. Architecture and frozen contracts are in `docs/implementation/ARCHITECTURE.md` and `src/contracts/`. Codex owns broad native/domain work and integration, Antigravity presentation components, Copilot bounded utilities/tests. Historical Txx research tasks remain on `coordination/BOARD.md`; new implementation tasks use Cxx/Axx/Pxx.

The user authorized installing missing development prerequisites and task-required dependencies. Prefer established, well-maintained libraries and modern ecosystem packages/crates over custom hand-rolled implementations, and use the latest stable technologies where compatible. Use existing Node 26 through nvm and Rust stable, preserve the default Node 8 alias, and avoid unrelated analysis engines or global configuration changes. Root manifests, lockfiles and capability registration are owned by Codex; workers propose additions in a packet or use their owned standalone Rust crate.

All Markdown is written in English. Reply to the user in their requested language. Prefix shell commands with `rtk`; use `rtk proxy` for unsupported commands or exact output.

## Evidence discipline

- Use the `reverse-engineer-anything` skill for the packaged app and runtime investigation. Prefer advertised REA tools and their actual schemas. If MCP tools are absent, use the pinned CLI with the supported Node runtime; do not repeat setup or change global Node defaults.
- Read `evidence/target.json` before comparing findings. Bind conclusions to Shottr version/build and resource or executable hashes.
- Distinguish `STATIC_OBSERVED`, `RUNTIME_VERIFIED`, `INFERRED`, and `UNKNOWN`. Do not describe a selector, label, framework dependency or filename as proof of implementation or successful behavior.
- Cite REA Evidence IDs and resource paths/object IDs. Ordinary shell observations must be labeled separately from REA output.
- Preserve tool limitations, truncation and incomplete hierarchy. Do not claim the Phase 1 inventory is exhaustive.
- Export complete Evidence before ending an MCP session if another agent needs to consume it. In-memory Evidence IDs do not transfer between independent servers.
- Store large raw JSON in `evidence/raw/`, captures in `captures/`, and copied app artifacts in `artifacts/`; these are Git-ignored. Track concise indexes and reports.

## Coordination and ownership

- **Before ending EVERY user request, all agents MUST publish a completion packet under `coordination/reviews/submissions/` using `scripts/review_queue.py submit`, including analysis-only, partial and blocked work.** Record summary, changed/report file snapshots, actual checks, limitations and next steps. A queue request needs a packet after each completed/partial task. Include packet IDs in the final response.
- Codex refreshes `coordination/reviews/INDEX.md` at the start/end of its requests, reviews actual code/evidence, and records decisions separately. DONE is not approval. STALE packets require a fresh submission. Agents never approve their own work on Codex's behalf.
- Use `scripts/review_queue.py claim/release` for new implementation tasks. Take only your reserved scope. If a claim/input is unavailable, skip to another independent task; do not wait or poll. Submit, release, then continue your queue without waiting for review.
- Only Codex edits shared contracts, application/native command wiring, root manifests/lockfiles, global CSS/configuration and generated review index/decisions. Other agents work in the path boundaries in the build queue. Never touch another agent's unfinished files to make a global check pass.
- Follow `coordination/PROTOCOL.md`. Claim a task before working; do not overwrite another agent's files or Git changes.
- `coordination/BOARD.md` and `docs/phase-1-features.md` have one integrator: Codex unless a handoff explicitly changes ownership. Other agents report through their own handoff files.
- Write findings to task-specific files under `docs/agents/<agent>/` and `coordination/handoffs/<agent>/`. Use unique timestamped message filenames under `coordination/messages/<recipient>/`.
- Do not assume an agent is running because a task recommends it. No automatic cross-client dispatcher is installed.
- Use the active build queue's roles. Read research/REA only when a specific target-behavior claim requires it; normal source implementation does not need REA. Keep Copilot inputs/output bounded; no full raw evidence or repository-wide scans for a small utility task.
- Never reset, clean, force-checkout, stage or commit another agent's work. A future implementation should use distinct worktrees or explicit file ownership.

## Runtime boundaries

Use synthetic images and isolated test windows. Native screenshot APIs may be invoked in the product only after an explicit user capture action; automated tests use an injected/fake runner. Observe permissions and report actual blockers. Do not change OS privacy settings, modify Shottr.app, activate licenses, upload images, configure cloud accounts, send telemetry or alter Shottr preferences. Ferby's own controlled settings UI is an authorized implementation feature.

Only one agent may operate Shottr's interactive UI at a time. Static artifact reads may run concurrently. Acquire the shared `runtime-shottr` claim before UI automation and release it in the task handoff. Close only sessions/processes owned by the investigation.

## Validation

Validate JSON, source links and hashes where relevant. Run meaningful scoped frontend/Rust tests and builds; do not claim global checks passed if another in-progress module failed. Check `rtk git diff --check` and `rtk git status --short`. Confirm `.vscode/`, raw evidence, captures, node_modules and Rust targets remain ignored; track application manifests/lockfiles. Submit the completion packet before the final response and release only your own claims.
