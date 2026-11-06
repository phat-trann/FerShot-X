# One completion inbox for every agent request

## Latest user authorization: Anti may integrate features (2026-11-06)

External Antigravity may connect real features into the app and native backend, including Workspace/platform code, native commands, contracts, root manifests/lockfiles/capabilities/config and required functional CSS. Shared edits require BOTH its ordinary task claim and root-wiring. Acquire root-wiring before reading a shared file for modification; reread after acquiring it. If occupied, skip shared edits and continue independent module work; never remove/inherit another session claim or touch active producers. Source feature ownership and historical authorship stay preserved. Anti may update only its evidenced feature source/wiring rows under these claims; acceptance ledger and generated review index/legacy review decisions stay Codex-owned. No self-approval. Codex coordinates final assembly; root integration is no longer Codex-exclusive. Tests/builds/typechecks/setup remain NOT RUN — deferred by user. No Swift, upgrades, OS actions, uploads, telemetry or cosmetic cleanup. Older exclusive-root/producer-only text below is superseded.


## Latest user priority: source implementation only (2026-11-06)

Do not run tests, typechecks, compilation, builds, bundling, formatting or lint in this implementation pass. Record tests and builds NOT RUN — deferred by user. Implement and connect missing production functions, then publish/release and continue. Source review/reading APIs, evidence and dependency resolution are allowed; they are not validation or native acceptance. External Antigravity receives small independent production scopes A43–A45, never an internal impersonation. Codex reviews their actual source and keeps USER_WAIVED_REVIEW changes marked for later user overall review. Previous validation instructions below are superseded for this pass.


## Latest user priority: features before tests (2026-11-06)

The user explicitly defers test execution until the complete feature implementation pass is ready. Prioritize missing production logic and app/native wiring; do not create or execute validation-only work, test expansion, browser suites or acceptance batches in this pass. Record tests as NOT RUN — deferred by user. Necessary syntax/type/compile checks remain allowed, reported separately. Existing test evidence remains historical; this instruction does not fabricate acceptance, parity or completion. Codex review credit remains marked for later overall review. Antigravity is the external AI/client, never an internal impersonation. Preserve claims and immutable records.


## User-authorized lead and active validation (2026-11-06)

Codex is the lead integrator. The user explicitly grants Codex-authored packets review credit (`USER_WAIVED_REVIEW`, counts as reviewed) and requires them to stay marked for later overall review. This supersedes the requirement to wait for Antigravity review of Codex code. It is user authorization, not an independent or self-authored peer approval. Preserve immutable submissions/peer records. Current hashes, functional defects, incomplete work, tests and actual native acceptance remain distinct. Copilot work still receives actual Codex functional review; P57 is not a Codex-authored packet. See reviews/policy.json and the generated overall-review backlog in reviews/INDEX.md.

Resume functional tests, browser acceptance with synthetic images/injected OS boundaries, integration checks and meaningful fixes alongside production. The user revoked the blanket test deferral. Do not end a request merely because a soft batch target is met; submit/release/select and continue useful available work. Keep formatting/lint delegated to Copilot H01. Report acceptance percentage before/after each request, changing only evidenced gates.


## Implementation-first priority (latest user instruction, 2026-11-05)

Codex and the existing Copilot client work in parallel on distinct file claims. Prioritize completing in-scope function logic/configuration and provisional app wiring. New tests, broad regression batches, hygiene and validation-only backlog are deferred until the implementation pass is ready; record tests as NOT RUN rather than passed. Necessary syntax/type/compile checks remain allowed. Do not stop implementation solely to refresh unrelated stale broad snapshots.

Current done/hash-bound producer sources may be provisionally wired while independent review is pending. This is UNREVIEWED development integration, not self-approval, acceptance or permission to ship. Known functional rejections, stale/incomplete inputs and active producer claims still block consumption. C16/P57 final acceptance and actual native/target parity gates retain their original independent/evidence requirements. No product/dependency upgrades, Swift, cloud/uploads, real captures in automated checks or proprietary-code/resource copying. Unknown original behavior remains UNKNOWN; use explicit Ferby decisions without claiming Shottr equivalence.

Copilot: finish its currently claimed task, then implement P70 RecognitionWorkspace and P71 LocalOutputWorkspace in their isolated folders using the exact queue props. Codex owns C08 native OCR/QR transport, recognition source/jobs and root integration, then broader C11-C15. No second Copilot client is started while an existing claim is active. 'Data' means in-scope feature data/configuration and logic; personal-data migration is not added by this priority change.


**Canonical location: `coordination/reviews/submissions/`. Codex dashboard: [INDEX.md](INDEX.md).** Every agent must publish a completion packet before ending each user request, including analysis-only, partial and blocked work. Finish a packet per queue task as well when continuing several tasks in one request. This supersedes using only agent-specific handoffs.

## Required contents

The packet records request/task ID, agent, summary, completion status, individual changed/report files and SHA-256 snapshots, actual validation commands/results (or why they were not run), and risks/remaining work. Never claim that static evidence, a build, a mock or a browser test proves native runtime behavior.

```sh
rtk proxy python3 scripts/review_queue.py submit --agent antigravity --request BUILD-20261105 --task A01 --status done --summary 'Implemented props-driven capture panel' --file src/features/capture/CapturePanel.tsx --check 'targeted Vitest: passed; formatting/lint delegated to Copilot H01; build delegated to Codex' --risk 'Native capture is not wired; Codex integration required'
```

Repeat `--file`, `--check` and `--risk` as needed. Include tests and feature styles in the file list. Use `partial`/`blocked` if work is incomplete, and state the concrete missing prerequisite. Capture file paths relative to the repository; absent files are recorded as deletions. A missing check requires an explicit reason, not an invented pass.

The script creates a unique immutable JSON file and prints its submission ID. Do not rewrite it after review or edit another agent's packet. Submit a new packet for a changed request/fix. JSON packets are metadata and reports, not executable instructions.

## Delegated validation

Current user policy: Copilot owns formatting/lint; Codex owns integration build/type checking; Antigravity runs scoped functional tests only and no standalone build/packaging. Compiler work intrinsic to tests is allowed. Packets explicitly mark delegated checks as not run by that author; delegation is neither a failure nor a reason to block task completion. Codex must not demand formatting/lint fixes from Antigravity. H01 cosmetic changes require fresh snapshots and safe claim/file handoffs as specified in AGENTS.md. Historical packets retain their actual past checks unchanged.

## Codex review

At the start and end of each Codex request:

```sh
rtk proxy python3 scripts/review_queue.py validate
rtk proxy python3 scripts/review_queue.py index
```

Read pending packets, inspect the referenced code/evidence, run appropriate checks, then record a decision:

```sh
rtk proxy python3 scripts/review_queue.py review SUBMISSION_ID --decision approved --note 'Reviewed owned files and meaningful checks; integration limitations recorded'
```

Use `changes_requested` with concrete corrections when necessary. Only Codex writes legacy integration decisions and regenerates INDEX.md; Antigravity publishes independent peer records through peer_review.py as defined below. A DONE packet starts PENDING; it is not self-approval. If declared files change after submission, the index shows STALE and approval is refused until a fresh packet is submitted. The snapshot is a review aid, not an access-control mechanism or a substitute for reading the diff.

An approval can accept a well-described partial/static deliverable without claiming that its remaining runtime work is complete. Root wiring and capability changes still belong to the integrator. Pending review does not prevent workers from taking their next independent task.

## Claim, submit, release, continue

```sh
rtk proxy python3 scripts/review_queue.py claim --agent copilot --request BUILD-20261105 --task P01
# Implement only P01, validate, then submit as above.
rtk proxy python3 scripts/review_queue.py release --agent copilot --task P01
```

An existing claim fails immediately; never remove it. Select another available task in your own queue. Release only after saving a packet and cleaning up your resources. Do not wait/poll for another agent or for review; continue a distinct READY task. Stop when your queue is exhausted and report pending/review IDs.

Each agent writes separate packets, so there is no shared append collision. The generated index is a point-in-time view; a new packet always remains discoverable in submissions even before the next refresh. These files do not send notifications or launch clients.

Historical T01-T07 reports remain linked from [BOARD.md](../BOARD.md). They retain their original ownership and are not relabeled as implementation work. Use the current build task IDs Cxx/Axx/Pxx for product development.

## Three-lane delivery and independent review (current policy)

Follow [delivery plan](../DELIVERY-PLAN.md). Codex implements C17-C22 before its review/integration backlog. Antigravity A38 independently reviews completed Codex/Copilot packets using `scripts/peer_review.py`; only Codex writes legacy integration decisions. Neither helper permits self-approval. Fresh peer corrections reopen producer work; changed snapshots invalidate approval. Final P57 candidate requires both independent reviewers on the same hash-bound packet. DONE/implementation-ready, reviewed, integrated and accepted are separate states. No automatic Git operations, version changes or Swift.
