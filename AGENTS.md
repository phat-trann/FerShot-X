# Agent instructions

## Implementation-first priority (latest user instruction, 2026-11-05)

Codex and the existing Copilot client work in parallel on distinct file claims. Prioritize completing in-scope function logic/configuration and provisional app wiring. New tests, broad regression batches, hygiene and validation-only backlog are deferred until the implementation pass is ready; record tests as NOT RUN rather than passed. Necessary syntax/type/compile checks remain allowed. Do not stop implementation solely to refresh unrelated stale broad snapshots.

Current done/hash-bound producer sources may be provisionally wired while independent review is pending. This is UNREVIEWED development integration, not self-approval, acceptance or permission to ship. Known functional rejections, stale/incomplete inputs and active producer claims still block consumption. C16/P57 final acceptance and actual native/target parity gates retain their original independent/evidence requirements. No product/dependency upgrades, Swift, cloud/uploads, real captures in automated checks or proprietary-code/resource copying. Unknown original behavior remains UNKNOWN; use explicit Ferby decisions without claiming Shottr equivalence.

Copilot: finish its currently claimed task, then implement P70 RecognitionWorkspace and P71 LocalOutputWorkspace in their isolated folders using the exact queue props. Codex owns C08 native OCR/QR transport, recognition source/jobs and root integration, then broader C11-C15. No second Copilot client is started while an existing claim is active. 'Data' means in-scope feature data/configuration and logic; personal-data migration is not added by this priority change.


## Scope

The user has selected **Tauri 2 + Rust**, with React/TypeScript for the frontend, to build Ferby Shottr. The earlier investigation-only restriction is superseded. Preserve the Shottr investigation as reference; do not invent unknown target behavior or copy proprietary resources/code. Omit cloud/S3 upload features for now (FTP upload is deferred to a later phase), and bypass all licensing/activation checks or nag prompts so that every feature is unlocked by default.

The unlocked-feature rule applies to Ferby's own implementation; do not alter Shottr.app, its license state or proprietary code. Upload exclusions apply to the active MVP.

## Native language policy

The latest user instruction excludes Swift implementation, Swift compilation/packaging and Swift runtime helper processes. Native functionality stays in Rust; macOS Vision OCR/QR uses the mature objc2-vision Objective-C framework bindings from Rust. A33 supersedes A13. Preserve the old Swift prototype as reference only; do not execute its old task/build/test instructions. React/TypeScript frontend and Apple system framework use remain permitted. No product/dependency version upgrades or minimum OS bump is authorized.

## Version and parity gate

Version 0.1.0 is the compatibility baseline. First reproduce the complete requested function set and verify the corresponding behavior within the frozen 0.1.0 stack; do not raise dependency or product versions, or move on to broader UI polish, until function parity is complete. Version upgrades and post-parity UI expansion are a later phase and require an explicit requirement update.

Begin with these instructions, `coordination/BUILD-QUEUE.md` and `coordination/reviews/README.md`, then only the inputs named by your task. Architecture and frozen contracts are in `docs/implementation/ARCHITECTURE.md` and `src/contracts/`. Codex implements C17-C22 and owns shared boundaries/integration; Codex and Antigravity independently review each other under coordination/DELIVERY-PLAN.md; Antigravity owns presentation/composition/rendering and the explicitly assigned standalone settings crate; Copilot owns bounded utilities/tests. The active queue reserves exact paths and supersedes older role summaries. Historical Txx research tasks remain on `coordination/BOARD.md`; new implementation tasks use Cxx/Axx/Pxx.

The user authorized installing missing development prerequisites and task-required dependencies. Prefer established, well-maintained libraries and modern ecosystem packages/crates over custom hand-rolled implementations, but keep the selected 0.1.0 stack and versions frozen until the parity gate is met. Use existing Node 26 through nvm and Rust stable, preserve the default Node 8 alias, and avoid unrelated analysis engines or global configuration changes. Root manifests, lockfiles and capability registration are owned by Codex; workers propose additions in a packet or use their owned standalone Rust crate.

All Markdown is written in English. Reply to the user in their requested language. Prefix shell commands with `rtk`; use `rtk proxy` for unsupported commands or exact output.

## Evidence discipline

- Use the `reverse-engineer-anything` skill for the packaged app and runtime investigation. Prefer advertised REA tools and their actual schemas. If MCP tools are absent, use the pinned CLI with the supported Node runtime; do not repeat setup or change global Node defaults.
- Read `evidence/target.json` before comparing findings. Bind conclusions to Shottr version/build and resource or executable hashes. Follow `coordination/ORIGIN-PARITY.md` for source-grounded comparison cases; static coverage and synthetic Ferby checks never imply original runtime parity.
- Distinguish `STATIC_OBSERVED`, `RUNTIME_VERIFIED`, `INFERRED`, and `UNKNOWN`. Do not describe a selector, label, framework dependency or filename as proof of implementation or successful behavior.
- Cite REA Evidence IDs and resource paths/object IDs. Ordinary shell observations must be labeled separately from REA output.
- Preserve tool limitations, truncation and incomplete hierarchy. Do not claim the Phase 1 inventory is exhaustive.
- Export complete Evidence before ending an MCP session if another agent needs to consume it. In-memory Evidence IDs do not transfer between independent servers.
- Store large raw JSON in `evidence/raw/`, captures in `captures/`, and copied app artifacts in `artifacts/`; these are Git-ignored. Track concise indexes and reports.

## Coordination and ownership

Temporary staffing update (2026-11-05): follow `coordination/TWO-LANE.md` while Antigravity is unavailable this week. Codex and Copilot remain active; Copilot additionally owns P58-P69 bounded independent regressions. The latest user request authorizes Codex to execute free Antigravity A01-A37 producer scopes under its own identity and ordinary task claims; independent self-review remains forbidden. Existing review/acceptance gates and all pre-existing claims are preserved.

- The full delivery allocation and 100% gate are in `coordination/DELIVERY-PLAN.md`. Codex also implements C17-C22. The continuous known roadmap is `coordination/CONTINUOUS.md`, with feature coverage in `coordination/FUNCTION-MAP.md`. Use `scripts/next_task.py` to select available work from current packets/claims. Role ranges are Antigravity A01-A38 (A13 superseded) and Copilot P01-P57 plus H01; old fixed-range dispatcher text is superseded. No client auto-launch/restart or polling is installed.
- All root/shared-source writers acquire the shared `root-wiring` claim plus their task claim. H01 root/shared handoffs also require `root-wiring` and the producer claim before cosmetic writes. Acquire H01, then root-wiring (shared scopes only), then the producer claim; if any claim is occupied, release already acquired own claims and skip without waiting. Release only owned claims after packet publication.
- **Before ending EVERY user request, all agents MUST publish a completion packet under `coordination/reviews/submissions/` using `scripts/review_queue.py submit`, including analysis-only, partial and blocked work.** Record summary, changed/report file snapshots, actual checks, limitations and next steps. A queue request needs a packet after each completed/partial task. Include packet IDs in the final response.
- Codex refreshes `coordination/reviews/INDEX.md` at the start/end of its requests, reviews actual code/evidence, and records decisions separately. DONE is not approval. STALE packets require a fresh submission. No agent approves its own work. Codex snapshots require Antigravity peer review. Copilot snapshots have Codex and Antigravity review; final P57 requires both on the same unchanged candidate.
- Use `scripts/review_queue.py claim/release` for new implementation tasks. Take only your reserved scope. If a claim/input is unavailable, skip to another independent task; do not wait or poll. Submit, release, then continue your queue without waiting for review.
- Codex maintains `coordination/PROGRESS.md` from `coordination/progress.json`; agents propose completed gates with evidence in their packets, never raise percentages themselves. Percentages measure the declared MVP acceptance gates, not full Shottr parity or elapsed time.
- Only Codex edits shared contracts, application/native command wiring, root manifests/lockfiles, global CSS/configuration and generated review index/legacy integration decisions. Antigravity may publish its own immutable peer review records through `scripts/peer_review.py`; it does not edit producer code or legacy decisions. Other agents work in the path boundaries in the build queue. Never touch another agent's unfinished files to make a global check pass.
- Follow `coordination/PROTOCOL.md`. Claim a task before working; do not overwrite another agent's files or Git changes.
- `coordination/BOARD.md` and `docs/phase-1-features.md` have one integrator: Codex unless a handoff explicitly changes ownership. Other agents report through their own handoff files.
- Write findings to task-specific files under `docs/agents/<agent>/` and `coordination/handoffs/<agent>/`. Use unique timestamped message filenames under `coordination/messages/<recipient>/`.
- Do not assume an agent is running because a task recommends it. No automatic cross-client dispatcher is installed.
- Use the active build queue's roles. Read research/REA only when a specific target-behavior claim requires it; normal source implementation does not need REA. Keep Copilot inputs/output bounded; no full raw evidence or repository-wide scans for a small utility task.
- Never reset, clean, force-checkout, stage or commit another agent's work. A future implementation should use distinct worktrees or explicit file ownership.

## Runtime boundaries

Use synthetic images and isolated test windows. Native screenshot APIs may be invoked in the product only after an explicit user capture action; automated tests use an injected/fake runner. Observe permissions and report actual blockers. Do not change OS privacy settings, modify Shottr.app, activate licenses, upload images, configure cloud accounts, send telemetry or alter Shottr preferences. Ferby's own controlled settings UI is an authorized implementation feature.

Only one agent may operate Shottr's interactive UI at a time. Static artifact reads may run concurrently. Acquire the shared `runtime-shottr` claim before UI automation and release it in the task handoff. Close only sessions/processes owned by the investigation.

## Validation ownership (latest user instruction)

| Responsibility | Codex | Antigravity | Copilot |
| --- | --- | --- | --- |
| Functional tests for assigned work | Yes | Yes | Yes |
| Integration/type checking and application builds | Owns | No standalone build or packaging | Only if explicitly assigned |
| Formatting, whitespace/style checks and lint | Do not run or fix | Do not run or fix | Owns through H01 |

Codex and Antigravity must not run formatters, lint, `cargo fmt`, `cargo clippy` or `git diff --check`, or spend their feature tasks on cosmetic cleanup. They report functional defects and leave hygiene to Copilot. Antigravity must not run `npm run build`, Vite production builds, `cargo build`, Tauri builds, bundling or packaging. Targeted functional tests remain required; compilation intrinsic to `cargo test`/test runners is allowed. A standalone global typecheck is not required from Antigravity; Codex performs integration type/build checks.

Completion packets must distinguish actual tests from delegated checks: `Formatting/lint delegated to Copilot H01` and, for Antigravity, `Build delegated to Codex`. These delegations are not failures or blockers and do not require waiting. Codex reviews functionality/evidence, not formatting/lint compliance, and must not send cosmetic/lint-only corrections back to Antigravity.

Copilot H01 may check explicit completed file lists across roles. Before formatting another role's completed scope, acquire H01 and that producer task's ordinary claim as `copilot` for temporary hygiene-only ownership; skip any occupied/unfinished scope. This is the sole exception to that task's usual role owner and does not permit functional edits. For root/shared files require an explicit scoped Codex handoff identifying files and the applicable source claim; otherwise report findings without writes. Do not format an entire checkout or rewrite active files. Submit a new H01 packet with exact changed snapshots and checks; changed hashes make previous packets stale until the fresh snapshot is reviewed. Never modify immutable packets/decisions.

Use configured tools and bounded file lists; `cargo clippy` and `cargo fmt --check` belong to Copilot. Frontend lint/format tools are not assumed installed: record missing configuration, propose required dependencies/config and continue available Rust/scoped hygiene. Root manifest/tool installation changes still require the integrator's normal wiring step. Do not run `--fix` for semantic changes or suppress diagnostics blindly.

This policy supersedes older task/check examples and historical role wording. It does not weaken functional acceptance or imply that delegated checks have already passed.

## Validation

Validate JSON, source links and hashes where relevant. Run meaningful scoped functional tests and only the build checks assigned by the validation ownership table; do not claim global checks passed if another in-progress module failed. Inspect `rtk git status --short`; Copilot owns `rtk git diff --check` and all formatting/lint checks. Confirm `.vscode/`, raw evidence, captures, node_modules and Rust targets remain ignored; track application manifests/lockfiles. Submit the completion packet before the final response and release only your own claims.
