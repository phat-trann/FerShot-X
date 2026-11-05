# One completion inbox for every agent request

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
