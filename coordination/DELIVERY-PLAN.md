# Three-agent delivery plan

> Temporary staffing (2026-11-05): use [the two-agent allocation](TWO-LANE.md). Only Codex and Copilot run while Antigravity is unavailable; Codex also takes over free Axx production/fixes; P58-P63 provide bounded independent QA. Existing independent/final acceptance gates remain unchanged.


This is the current whole known function roadmap, not a claim that the original inventory is exhaustive. It supersedes earlier Codex-integration-only wording. Product/dependency versions stay frozen at 0.1.0; native implementation is Rust, with no Swift compiler/helper. All agents implement, test, submit and release their scopes continuously. Existing completed work is preserved.

## Three lanes

| Agent | Production ownership | Independent review | Validation |
| --- | --- | --- | --- |
| Codex | C17 capture sessions; C18 OCR/QR jobs; C19 output jobs; C20 archive workflow; C21 lifecycle/actions; C22 Rust effect pipeline. C07-C15 then wire reviewed modules into the app/native boundary. | C04 reviews Antigravity/Copilot; never approves own code. | Functional/IPC/browser checks, type checks and integration builds. No format/lint. |
| Antigravity | A01-A37 producer modules and composed editor/capture/layout/preferences workspaces; A13 inactive, replaced by Rust A33. | A38 reviews current Codex and Copilot packets when independent implementation is exhausted. | Scoped functional tests; no standalone builds/package, lint or format. |
| Copilot | P01-P50 bounded helpers/reference work; P51-P55 independent failure/race regressions; P56 Rust pipeline audit; P57 frozen release manifest. H01 owns safely handed-off hygiene. | Supplies reproducible regressions and review evidence; no self-approval. | Small named-file tests plus H01 formatting/lint. |

The exact queue is `build-tasks.json`, selected by `scripts/next_task.py`. At the time of this allocation there are 117 task definitions: 22 Codex, 38 Antigravity (A13 inactive, A38 recurring), 57 Copilot, plus recurring H01 metadata. Definitions are not acceptance points or a progress denominator.

## Scheduling without a central waiting role

1. Fix fresh functional review requests first.
2. Check stale implementation snapshots, then implement independent available work. Codex now takes C17-C22 before the C04 review backlog. Workers do not wait for approval to start their next isolated module.
3. When implementation is exhausted or unavailable, Codex/Antigravity review fresh non-self packets. Continue another independent task if a producer scope is occupied; never wait/poll or absorb its module.
4. Codex integrates only the relevant reviewed inputs under root-wiring plus integration-task claim. New producer approvals reopen partial integrations. This can happen in reviewed batches; final integration acceptance follows the complete implementation/review gates.
5. Codex performs final C16 acceptance after all C07-C15 integration packets are complete and independently approved. C16 supplies a reviewed explicit source/evidence hash list in `coordination/release/input-manifest.json`. Copilot P57 snapshots only that named final candidate list without a checkout scan; both reviewers approve that same unchanged P57 packet before final acceptance.

No queue can guarantee that all three clients stay active when every remaining task genuinely needs missing native permission, a failed prerequisite or the other role's unfinished work. The selector records concrete blockers and stops instead of polling. Files do not launch/restart clients. Keep one client per role; use START-HERE once per running session and let it select sequentially.

## Independent review and merge rules

Producer completion means implementation ready for review, not accepted. A review is of actual code plus evidence, not the author's summary. Reviews never require formatting/lint from Codex/Antigravity or standalone builds from Antigravity.

- Codex-owned code: Antigravity records its independent decision with `scripts/peer_review.py`; Codex cannot approve itself through either review helper.
- Antigravity-owned code: Codex records independent review and the existing integration decision. For new reviews use both peer_review.py and review_queue.py so the existing producer gate and cross-review ledger stay aligned.
- Copilot-owned code/evidence: Codex and Antigravity independently review; a current requested correction from either reviewer blocks acceptance. Existing legacy decisions remain historical evidence, not a retroactive second reviewer.
- Review only current completed snapshots; skip occupied producer claims. Immutable peer records live in `coordination/reviews/peer/`; hashes bind them to the exact submission. Code changing invalidates review, and a new packet needs a new review. Do not edit producer files during review.
- The producer fixes functional findings and submits again; reviewers do not take over its active implementation. Root/native integration remains Codex-owned and must produce its own packet for Antigravity review.
- Final P57 packet must contain the exact candidate file snapshots and acceptance evidence. Codex and Antigravity approve the same current packet. `peer_review.py status ID` reports this joint candidate check. A later change invalidates both approvals.
- Codex owns local application integration after review. No automatic Git commit, staging, push, branch merge, deployment or installation is performed by these helpers. Do not mix concurrent unreviewed work into a claimed accepted candidate.

Commands:

```sh
rtk proxy python3 scripts/next_task.py --agent codex --claim
rtk proxy python3 scripts/peer_review.py list --reviewer antigravity
rtk proxy python3 scripts/peer_review.py review PACKET_ID --reviewer antigravity --decision approved --note 'Actual source and evidence reviewed; limits recorded' --check 'Actual scoped functional result'
rtk proxy python3 scripts/peer_review.py status P57_PACKET_ID
```

A38 publishes its own completion packet after a review batch, releases its claim and resumes. Codex also publishes per task/request. Peer records do not replace completion packets. C04/A38 review-batch reports are not automatically queued for another peer review, which prevents an endless review-of-review cycle; the underlying product snapshots and final candidate still require independent review.

## Definition of 100%

Implementation-ready, independently reviewed, integrated and accepted are separate states. Only the last is delivery completion.

100% of the declared in-scope function set requires all F01-F26 and F30-F32 affordances/subfeatures to have explicit acceptance evidence or an explicitly approved requirement deviation; all functional corrections resolved; independently reviewed implementation and root integration; scoped regressions and integration build passed; relevant actual native acceptance performed; source/target comparison gaps resolved or explicitly accepted; and both reviewers signing the same final P57 candidate. Unknown native behavior, a mock pass, an unexecuted test or a missing feature cannot be silently waived.

F27-F29 uploads, F33 licensing gates and F34 telemetry are deliberate exclusions; FTP stays deferred. Ferby's own onboarding/preferences remain in scope. No Shottr app/license/preferences modification is authorized. The initial target inventory is static, and some exact original behavior remains unknown; see ORIGIN-PARITY.md.

The existing MVP ledger remains 61.25% and retains its old weights/scope. This broader delivery plan defines the finish gate; it does not silently turn task counts into a new percentage or certify 100% Shottr parity.

## Full feature ownership

This table maps every known source group to producer, independent QA and integration work. Existing FUNCTION-MAP owners remain valid; the new lanes remove additional implementation load from root integration. Native acceptance/evidence limits apply to every row.

| Feature | Existing owners | Additional production / independent QA | Final integration |
| --- | --- | --- | --- |
| F01 | C02/C11; A25/P34 | C17; P43/P51 | C11 |
| F02 | A22/A23/P30/C11 | C17; P43/P51 | C11 |
| F03 | A11/A12/A33/P23/P24/C08 | C18; P44/P52 | C08 |
| F04 | A11/P21/P23/C08/C10 | C18; P44/P52 | C08/C10 |
| F05 | A14/P35/C08; current import | P44/P35 | C08 |
| F06 | A04/A06/A07/A08/A16/A32/P25/P26/C07/C12 | A34; P45 | C07/C12 |
| F07 | A17/P27/P33/C01/C12 | A34; P45 | C12 |
| F08 | A18/C12 | A34; P46 | C12 |
| F09 | A19/C12 | C22; P46/P56 | C12 |
| F10 | A16/A17/A18/P28/C12 | A34; P45 | C12 |
| F11 | C03/A32/P25/P26/C07/C12 | A34; P45 | C07/C12 |
| F12 | C03/A31/C12 | P46 | C12 |
| F13 | C01/P09/A07/A08/C07 | A34/C19; P45/P53 | C07 |
| F14 | A21/P29/C12 | A36; P47 | C12 |
| F15 | P06/P14/A32/C07 | A34; P45 | C07 |
| F16 | P02/A27/C12 | A36; P46 | C12 |
| F17 | P01/P13/P14/P32/C04/C08 | P46 | C04/C12 |
| F18 | A20/P31/C12 | A36; P47 | C12 |
| F19 | A20/C12 | A36; P47 | C12 |
| F20 | A05/P10/C09 | A35; P48 | C09 |
| F21 | A02/A29/P17/P19/C14 | C20; P48/P54 | C14 |
| F22 | A15/P39/C09 | A35; P48 | C09 |
| F23 | A24/P34/C10 | A35/C19; P49/P53 | C10 |
| F24 | C06/A30/P38/P40/C08/C15 | C19; P49/P53 | C15 |
| F25 | A03/A09/A10/P08/P20/P36/C10 | A37; P49 | C10 |
| F26 | A26/C11/C12 | A36; P47 | C11/C12 |
| F27 | EXCLUDED | P50 verifies exclusion | EXCLUDED |
| F28 | EXCLUDED | P50 verifies exclusion | EXCLUDED |
| F29 | EXCLUDED | P50 verifies exclusion | EXCLUDED |
| F30 | A25/C13 | A37/C21; P50/P55 | C13 |
| F31 | A28/C10/C13 | A37/C21; P50/P55 | C13 |
| F32 | P37/C15 | C21; P50/P55 | C15 |
| F33 | EXCLUDED license gates; A25/A28 for own setup | P50 verifies exclusion | EXCLUDED |
| F34 | EXCLUDED; C16 verifies absence | P50 verifies exclusion | EXCLUDED |

## Complete task allocation

This is the reserved whole known backlog, not a static DONE report. Current hashes, packets, decisions and claims determine task availability. Refer to the selected definition for named inputs, acceptance and exact file boundaries.

### codex

| Task | Deliverable | Work type | Independent reviewer |
| --- | --- | --- | --- |
| C01 | Annotation model and history | implementation | antigravity |
| C02 | macOS capture core | implementation | antigravity |
| C03 | Image transform and export core | implementation | antigravity |
| C04 | Review and integrate available modules | review | antigravity |
| C05 | Foundation regression and native boundary hardening | implementation | antigravity |
| C06 | Native image clipboard copy | implementation | antigravity |
| C07 | Editor and raster-export integration | integration | antigravity |
| C08 | Native clipboard import and local OCR bridge | integration | antigravity |
| C09 | Restricted pin/preview windows | integration | antigravity |
| C10 | Settings persistence and actual preference effects | integration | antigravity |
| C11 | User-triggered scrolling and capture modes | integration | antigravity |
| C12 | Annotation/effect/backdrop/composition integration | integration | antigravity |
| C13 | Global shortcut and app lifecycle wiring | integration | antigravity |
| C14 | Explicit local archive integration | integration | antigravity |
| C15 | Deep links, print and user-initiated drag | integration | antigravity |
| C16 | Functional parity acceptance and release gate | acceptance | antigravity |
| C17 | Capture session controller | implementation | antigravity |
| C18 | Recognition job controller | implementation | antigravity |
| C19 | Output job orchestration | implementation | antigravity |
| C20 | Local archive workflow controller | implementation | antigravity |
| C21 | Application lifecycle and action policy | implementation | antigravity |
| C22 | Bounded native image effects pipeline | implementation | antigravity |

### antigravity

| Task | Deliverable | Work type | Independent reviewer |
| --- | --- | --- | --- |
| A01 | Capture panel | implementation | codex |
| A02 | Session library panel | implementation | codex |
| A03 | Ferby settings panel | implementation | codex |
| A04 | Editor interaction view | implementation | codex |
| A05 | Pin and preview presentation | implementation | codex |
| A06 | Editor toolbar | implementation | codex |
| A07 | Composed editor workbench | implementation | codex |
| A08 | Annotation bitmap renderer | implementation | codex |
| A09 | Standalone settings persistence crate | implementation | codex |
| A10 | Controlled export options panel | implementation | codex |
| A11 | OCR result controls | implementation | codex |
| A12 | QR recognition controls | implementation | codex |
| A13 | Local Vision OCR/QR core | implementation | codex |
| A14 | Clipboard image import core | implementation | codex |
| A15 | Post-capture preview controller | implementation | codex |
| A16 | Ellipse and line drawing primitives | implementation | codex |
| A17 | Text and counter annotation controls | implementation | codex |
| A18 | Highlight spotlight magnifier renderer | implementation | codex |
| A19 | Concealment and erase pixel core | implementation | codex |
| A20 | Backdrop composition renderer | implementation | codex |
| A21 | Multi-image composition | implementation | codex |
| A22 | Scrolling frame stitching core | implementation | codex |
| A23 | Scrolling capture controls | implementation | codex |
| A24 | Post-capture action planner | implementation | codex |
| A25 | Shortcut assignment controls | implementation | codex |
| A26 | Window capture appearance core | implementation | codex |
| A27 | Measurement overlay controls | implementation | codex |
| A28 | Application preference controls | implementation | codex |
| A29 | Local session archive core | implementation | codex |
| A30 | Local output and print presentation | implementation | codex |
| A31 | Non-destructive automatic image adjustment | implementation | codex |
| A32 | Selection move and resize handles | implementation | codex |
| A33 | Rust-only local Vision OCR and QR core | implementation | codex |
| A34 | Composed advanced editor module | implementation | codex |
| A35 | Composed post-capture workflow | implementation | codex |
| A36 | Composed image layout workspace | implementation | codex |
| A37 | Composed capability-aware preferences workspace | implementation | codex |
| A38 | Recurring independent review of Codex and Copilot packets | review | codex |

### copilot

| Task | Deliverable | Work type | Independent reviewer |
| --- | --- | --- | --- |
| P01 | Color formatting utilities | implementation | codex, antigravity |
| P02 | Measurement utilities | implementation | codex, antigravity |
| P03 | Editor shortcut matching | implementation | codex, antigravity |
| P04 | Export filename utilities | implementation | codex, antigravity |
| P05 | Bounded baseline accessibility review | implementation | codex, antigravity |
| P06 | Fit-to-viewport utility | implementation | codex, antigravity |
| P07 | Crop request validation helper | implementation | codex, antigravity |
| P08 | Settings JSON codec | implementation | codex, antigravity |
| P09 | Independent history regression tests | implementation | codex, antigravity |
| P10 | Pin parameter utilities | implementation | codex, antigravity |
| P11 | Native acceptance checklist | implementation | codex, antigravity |
| P12 | PNG metadata header validation | implementation | codex, antigravity |
| P13 | RGBA pixel sampling | implementation | codex, antigravity |
| P14 | Client to image coordinate mapping | implementation | codex, antigravity |
| P15 | Rectangle intersection | implementation | codex, antigravity |
| P16 | Annotation bounds | implementation | codex, antigravity |
| P17 | Session selection transitions | implementation | codex, antigravity |
| P18 | Byte-size display formatting | implementation | codex, antigravity |
| P19 | Stable session image sorting | implementation | codex, antigravity |
| P20 | Explicit output-dimension planning | implementation | codex, antigravity |
| P21 | OCR text normalization | implementation | codex, antigravity |
| P22 | Clipboard adapter invalid-input regressions | implementation | codex, antigravity |
| P23 | OCR language option validation | implementation | codex, antigravity |
| P24 | QR payload classification | implementation | codex, antigravity |
| P25 | Rectangle handle resize geometry | implementation | codex, antigravity |
| P26 | Move annotation point geometry | implementation | codex, antigravity |
| P27 | Counter label formatting | implementation | codex, antigravity |
| P28 | Annotation style value validation | implementation | codex, antigravity |
| P29 | Snapping candidate distances | implementation | codex, antigravity |
| P30 | Stitch frame budget planning | implementation | codex, antigravity |
| P31 | Backdrop output sizing | implementation | codex, antigravity |
| P32 | Color averaging helper | implementation | codex, antigravity |
| P33 | Annotation text value bounds | implementation | codex, antigravity |
| P34 | Capture action transition helper | implementation | codex, antigravity |
| P35 | Clipboard import negative-path tests | implementation | codex, antigravity |
| P36 | Settings compatibility fixtures | implementation | codex, antigravity |
| P37 | Deep-link request parser | implementation | codex, antigravity |
| P38 | Export name collision sequence | implementation | codex, antigravity |
| P39 | Preview timeout state | implementation | codex, antigravity |
| P40 | Print page geometry | implementation | codex, antigravity |
| P41 | Parity test case inventory | implementation | codex, antigravity |
| P42 | Functional regression triage | implementation | codex, antigravity |
| P43 | Source-grounded parity cases: capture | implementation | codex, antigravity |
| P44 | Source-grounded parity cases: recognition-import | implementation | codex, antigravity |
| P45 | Source-grounded parity cases: annotation-history | implementation | codex, antigravity |
| P46 | Source-grounded parity cases: effects-colors | implementation | codex, antigravity |
| P47 | Source-grounded parity cases: composition-background | implementation | codex, antigravity |
| P48 | Source-grounded parity cases: pin-library-preview | implementation | codex, antigravity |
| P49 | Source-grounded parity cases: output | implementation | codex, antigravity |
| P50 | Source-grounded parity cases: lifecycle-exclusions | implementation | codex, antigravity |
| P51 | Independent capture-session negative-path regressions | implementation | codex, antigravity |
| P52 | Independent recognition-workflow negative-path regressions | implementation | codex, antigravity |
| P53 | Independent output-jobs negative-path regressions | implementation | codex, antigravity |
| P54 | Independent archive-workflow negative-path regressions | implementation | codex, antigravity |
| P55 | Independent lifecycle-policy negative-path regressions | implementation | codex, antigravity |
| P56 | Independent Rust effects pipeline acceptance audit | implementation | codex, antigravity |
| P57 | Frozen final release candidate evidence manifest | acceptance | codex, antigravity |

H01: recurring Copilot hygiene, exact completed-file handoffs and producer/shared claims required. A13 is historical inactive work; it is not part of implementation completion.
