# Temporary two-agent allocation — 2026-11-05

## Implementation-first priority (latest user instruction, 2026-11-05)

Codex and the existing Copilot client work in parallel on distinct file claims. Prioritize completing in-scope function logic/configuration and provisional app wiring. New tests, broad regression batches, hygiene and validation-only backlog are deferred until the implementation pass is ready; record tests as NOT RUN rather than passed. Necessary syntax/type/compile checks remain allowed. Do not stop implementation solely to refresh unrelated stale broad snapshots.

Current done/hash-bound producer sources may be provisionally wired while independent review is pending. This is UNREVIEWED development integration, not self-approval, acceptance or permission to ship. Known functional rejections, stale/incomplete inputs and active producer claims still block consumption. C16/P57 final acceptance and actual native/target parity gates retain their original independent/evidence requirements. No product/dependency upgrades, Swift, cloud/uploads, real captures in automated checks or proprietary-code/resource copying. Unknown original behavior remains UNKNOWN; use explicit Ferby decisions without claiming Shottr equivalence.

Copilot: finish its currently claimed task, then implement P70 RecognitionWorkspace and P71 LocalOutputWorkspace in their isolated folders using the exact queue props. Codex owns C08 native OCR/QR transport, recognition source/jobs and root integration, then broader C11-C15. No second Copilot client is started while an existing claim is active. 'Data' means in-scope feature data/configuration and logic; personal-data migration is not added by this priority change.


The user reports that Antigravity has exhausted its quota until the end of this week. Run Codex and Copilot only until Antigravity explicitly resumes. This staffing update supersedes older instructions to start three clients. It does not waive independent acceptance or change product/dependency versions.

## Persisted Antigravity checkpoint

Repository packets and immutable peer records, rather than the last chat update, show:

- A34 `20261105T142037-antigravity-A34-13ce7fff`, A35 `20261105T142045-antigravity-A35-7acd0de9`, A36 `20261105T142049-antigravity-A36-13a856a5`, A37 `20261105T142051-antigravity-A37-644b1abc` are the refreshed snapshots after H01.
- C20 `20261105T135941-codex-C20-321515d8`, C21 `20261105T140355-codex-C21-a0317c2e`, C22 `20261105T141014-codex-C22-40156c74` have Antigravity approvals. See `docs/agents/antigravity/A38-20261105T1424.md` and the matching peer records.
- P53 `20261105T142509-copilot-P53-4d707bde`, P54 `20261105T142646-copilot-P54-79ce7a4e`, P55 `20261105T142747-copilot-P55-20ddc4fc` also have Antigravity approvals. See `docs/agents/antigravity/A38-20261105T1428.md` and matching peer records.
- P56 `20261105T142851-copilot-P56-fc528c37` has no Antigravity peer record at this checkpoint. Preserve it as pending.

These are saved review results, not tests rerun by the staffing update. Recheck hashes before consuming any approval. All ten named A34-A37/C20-C22/P53-P55 packets pass the current snapshot checker at this checkpoint. However, A35 lists `.ts` implementation/test paths while actual files are `CaptureWorkflowController.tsx` and `CaptureWorkflowController.test.tsx`; a current metadata check does not establish coverage of those actual files. Codex must inspect this gap and request a fresh complete producer snapshot before approving A35. P59 names the actual `.tsx` inputs.

## Codex lane

Review actual current A34-A37 code and P51-P56 evidence; record functional decisions, then continue C07-C15 integration under the existing task/root-wiring protocol. Resolve functional findings in Codex-owned scopes and perform type/integration builds. Use Copilot's new P58-P61 reports as extra independent regression evidence. The user explicitly reassigned Antigravity implementation and corrections to Codex on 2026-11-05. Codex may claim free A01-A37 producer scopes as codex, preserving historical authorship and submitting new packets under its own identity. Do not edit occupied scopes. A38 independent self-review cannot be reassigned to the same producer; new Codex-written code still awaits an independent reviewer.

At this checkpoint `root-wiring`, `C04`, `C04-CP-AUDIT` and `C04-UI-AUDIT` are occupied by existing Codex claims. Their presence is not proof of a running process. This request neither removes nor inherits those claims. The owning session must finish/release them before another session starts shared edits. Independent coordination work can proceed meanwhile.

## Copilot lane

Keep existing P01-P57/H01 work. New P58-P61 add bounded independent functional regressions for A34-A37 respectively; exact two-file inputs and test/report output paths are in `build-tasks.json`. These tasks are available through the unchanged selector and do not need root-wiring. Skip any occupied producer scope; do not rewrite producer code. H01 remains limited to explicit completed-file handoffs and its required claims.

After each task: submit an immutable packet, release only acquired claims, and select again. Independent tests may produce findings; fixing the producer is a separate claimed task. Do not rerun completed C20-C22/P53-P55 merely because Antigravity's chat ended mid-update.

## Review and release limits

Copilot does not write reviews under Antigravity's identity. Codex cannot approve its own product code. Existing approvals remain valid only for unchanged snapshots. New Codex integration snapshots and missing second reviews accumulate for Antigravity's return; this does not prevent independent implementation and tests. C16/P57 and final dual-signature acceptance retain their existing prerequisites. No 100% claim, release waiver or progress increase is authorized by staffing changes.

No client is automatically launched, messaged or polled. Resume Antigravity only after quota is available and revalidate pending hashes first.

## Expanded execution ownership (latest user request)

Codex now executes both Cxx production/integration and available Axx production/fixes. Use the ordinary producer task claim under `--agent codex` for each explicit handoff; preserve pre-existing claims and old packets. The selector still maintains historical role queues, so an authorized Axx takeover is explicitly claimed rather than impersonating the Antigravity client. No blanket reset of completed tasks is permitted. A35 is the first takeover: source lifetime, cancellation and asynchronous preview actions, plus a complete actual-file snapshot.

Copilot retains P58-P61 and receives P62/P63 for small independent A35 preview-failure and lifecycle regressions after the Codex hardening packet is published. Each owns one test file and one report, reads two named inputs, and may not modify producer code. Run each after the producer claim is free. Do not spawn replacement clients automatically.

Integration typecheck during the A35 takeover found two independent Copilot compile corrections. P53 must use a mutable caller fixture for its deliberate source-mutation regression (TS2540); P54 must correct callback observation narrowing and use public archive entry types (TS2339/TS2322). Fresh Codex changes-requested decisions reopen the ordinary P53/P54 tasks, retaining their exact owned files; fix these before new independent tests. Antigravity's earlier runtime test approvals do not establish TypeScript compilation.

## Additional bounded Rust QA wave (P64-P67)

P58-P61 have completion packets; P53/P54 compile corrections and P62/P63 remain actionable at this checkpoint. New P64-P67 each own one integration-test file inside a different standalone crate and one <=150-word report. Inputs are exactly that crate's `src/lib.rs` and `Cargo.toml`, with the existing lockfile required for `--locked` tests.

| Task | Producer | Independent scope | Test target |
| --- | --- | --- | --- |
| P64 | A33 | Vision request/backend/result boundaries using fake backend only | `vision-core/tests/copilot_p64.rs` |
| P65 | A22 | RGBA stitching validation, tolerance and source preservation | `scroll-core/tests/copilot_p65.rs` |
| P66 | A29 | Session manifest/payload integrity and failed-write preservation | `session-core/tests/copilot_p66.rs` |
| P67 | A09 | Settings UTF-8 byte limits, schema/types and persistence boundaries | `settings-core/tests/copilot_p67.rs` |

All paths in the table are relative to `src-tauri/crates/`. Run only the exact integration-test target named in the task, with `cargo test --locked --manifest-path ... --test copilot_pNN`; never run native Vision library tests. No source/manifest/lockfile changes, new dependencies or native actions are delegated. P66/P67 may use isolated tempfile directories. If producer scope is occupied, publish a blocked packet and continue another task, without reading active files. Findings go to Codex, which owns producer fixes. Tests passing do not approve native integration or original runtime parity.

## Production adapter wave and progress checkpoint

On 2026-11-05 the accepted MVP ledger remains 61.25%; no new native/manual gate was credited. Full Shottr parity has no accepted percentage. Eight Copilot tasks (P53/P54 fixes and P62-P67) were ready with no Copilot claim at this checkpoint; adding tasks does not start a client.

C23 and C24 now give Codex isolated production work even while the pre-existing root-wiring claim is occupied. C23 adapts C18 recognition jobs to injected A33-shaped Vision ports, with strict source/revision/result checks. C24 adapts C17 capture sessions to an injected RGBA stitch port derived from A22 limits and owned leases. Each owns a separate feature folder, tests and README. No application command or native runtime integration is implied. Root/native wiring remains C08/C11 work under existing claim/review gates.

P68/P69 independently test those adapters after current done producer packets and exports appear; skip active producer claims. Existing P53/P54 corrections stay first. Detailed two-file inputs and exact owned outputs are in build-tasks.json. These adapters/tests do not change the acceptance denominator or lift final independent signatures.
