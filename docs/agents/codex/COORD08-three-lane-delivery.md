# COORD08: three-agent implementation and independent acceptance

Request: allocate the whole known backlog across Codex, Antigravity and Copilot so every role implements continuously, then independently review and integrate the complete result.

## Changes

- Codex now owns six immediately available independent implementations C17-C22: capture session, recognition jobs, output jobs, archive workflow, application action/lifecycle policy and bounded native Rust effects pipeline. Completed C01-C03/C05/C06 are preserved; C07-C15 remain shared integration scopes.
- Antigravity keeps A01-A37 (A13 inactive) and gains recurring A38 independent review of completed Codex/Copilot packets. No build/package or format/lint work was assigned to Antigravity.
- Copilot keeps bounded helper/reference work plus H01 and gains P51-P55 public-API failure/race regressions, P56 scoped Rust audit, P57 final candidate evidence manifest. Future producer exports are explicit prerequisites; these tests never take over producer code.
- Added DELIVERY-PLAN.md with all 34 known inventory groups and all 117 task definitions (22 Codex, 38 Antigravity, 57 Copilot; H01 separately recurring). Count includes inactive A13 and recurring A38, so it is not a completion denominator. Updated three continuous entry prompts, ownership rules and durable per-role messages.
- Dispatcher now prioritizes functional corrections, stale implementation snapshots and independent implementation before review/integration backlog. Independent review is a real fallback work queue. Reviewed producer inputs reopen partial integration tasks; C16 requires current independently reviewed C07-C15, and P57 requires reviewed C16. The dependency graph is acyclic.
- Added immutable peer_review.py records, protected against self-approval and bound to exact packet hashes. Codex approval of own packets is also rejected by the legacy helper. Fresh peer corrections reopen producer work. Stale code invalidates approval. The review inbox includes independent peer records.
- P57 is the same frozen final candidate for both Codex and Antigravity signoff; the status helper reports their joint approval only for a current done P57 packet. This is a review gate, not proof of unperformed native checks or authority to bypass feature acceptance.

## 100% and operational limits

100% means all declared in-scope functions/subfeatures have accepted evidence, implementation and integration are independently reviewed, required tests/build/native acceptance pass, functional corrections are resolved, and both reviewers approve the same candidate. Task counts, DONE packets and mock tests are not accepted functional parity. MVP progress remains 61.25%; progress.json and its denominator were not changed.

No Swift, product/dependency upgrades, app source changes, real OS actions, privacy modifications, installation, Git commit/staging/push/merge or deployment occurred. Existing changes from other clients were preserved. Root-wiring and COORD08 protect this coordination-helper update; only owned claims are released after submission. Files do not auto-launch the three clients, and genuine external/native prerequisites can still exhaust a role's available work; no polling or fake busywork is installed.

## Validation

- 25 Python coordination tests passed, covering existing queue behavior, self-review rejection in both helpers, immutable/hash-bound peer approval, occupied producer skipping, fresh packet review, correction reopening, implementation priority, independent approval before integration and same-candidate dual signoff invalidation on change, and suppression of recursive review-of-review work, and independent eligibility of coordination helper code.
- Queue validation: 117 unique task IDs and expected role counts; all six Codex implementations immediately selectable with existing named prerequisites.
- All reviewed dependency IDs resolve and graph has no cycles.
- DELIVERY-PLAN covers all 34 source feature IDs and all 117 task definitions exactly once; entry/delivery local links resolve.
- Review packet validation passed for 146 existing records before this request submission.
- Formatting/lint delegated to Copilot H01; not run. Product source was not modified, so application/native builds were not repeated for this coordination change.

Next: each client finishes its current claim, reads its updated START-HERE dispatcher and selects available work. Codex implements C17-C22 rather than staying exclusively in C04; reviews and integration consume independently completed snapshots as specified by the delivery plan.
