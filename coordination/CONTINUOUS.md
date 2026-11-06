# Continuous agent queues

## Sustained parallel production (2026-11-06)

User requests more production work for both active clients while reviews wait. Aim for three useful Codex integration slices and four useful Copilot production tasks per request when inputs/scopes permit; this is scheduling guidance, not acceptance or a reason to generate filler. Finish one claim, publish/release and immediately take another independent source task. Prefer production panels/codecs and actual app/native wiring over test expansion, hygiene, review-only work or unrelated snapshot refreshes. Do not wait/poll for another client or start duplicate clients.

Copilot queue now includes P73 editor-session codec and P74 archive panel, P75 manual scroll controls, P76 effect-region panel, P77 capture preference codec. Codex integrates preview/preferences/scrolling/effects/archive using the completed APIs. Keep exact file ownership and source-ready UNREVIEWED development status. Missing original behavior remains UNKNOWN; final/native/review acceptance is still deferred, not approved.


## Implementation-first priority (latest user instruction, 2026-11-05)

Codex and the existing Copilot client work in parallel on distinct file claims. Prioritize completing in-scope function logic/configuration and provisional app wiring. New tests, broad regression batches, hygiene and validation-only backlog are deferred until the implementation pass is ready; record tests as NOT RUN rather than passed. Necessary syntax/type/compile checks remain allowed. Do not stop implementation solely to refresh unrelated stale broad snapshots.

Current done/hash-bound producer sources may be provisionally wired while independent review is pending. This is UNREVIEWED development integration, not self-approval, acceptance or permission to ship. Known functional rejections, stale/incomplete inputs and active producer claims still block consumption. C16/P57 final acceptance and actual native/target parity gates retain their original independent/evidence requirements. No product/dependency upgrades, Swift, cloud/uploads, real captures in automated checks or proprietary-code/resource copying. Unknown original behavior remains UNKNOWN; use explicit Ferby decisions without claiming Shottr equivalence.

Copilot: finish its currently claimed task, then implement P70 RecognitionWorkspace and P71 LocalOutputWorkspace in their isolated folders using the exact queue props. Codex owns C08 native OCR/QR transport, recognition source/jobs and root integration, then broader C11-C15. No second Copilot client is started while an existing claim is active. 'Data' means in-scope feature data/configuration and logic; personal-data migration is not added by this priority change.


> Temporary staffing (2026-11-05): use [the two-agent allocation](TWO-LANE.md). Only Codex and Copilot run while Antigravity is unavailable; Codex also takes over free Axx production/fixes; P58-P69 provide bounded independent QA. Existing independent/final acceptance gates remain unchanged.


Version: 0.1.0. Existing dependency/product versions remain frozen. This is the full known functional roadmap, not a claim of recovered Shottr implementation or completed parity. Upload/cloud/S3/FTP, proprietary licensing and telemetry remain excluded/deferred by current instructions.

## One command per client

Paste the following in Antigravity or Copilot, replacing ROLE with its client role:

```text
Work in /Users/phattran/Documents/Code/Personal/ferby-shottr as ROLE.
Read AGENTS.md and coordination/CONTINUOUS.md, then your role prompt.
Run rtk proxy python3 scripts/next_task.py --agent ROLE --claim.
Execute only the returned task and its named inputs/owned files.
Prioritize current functional review fixes, then stale own snapshots, then new tasks.
Run scoped functional tests; submit an immutable packet after EACH task/request.
Release every claim listed by the selector, then select the next task immediately.
Do not wait for review, poll, redo current submitted work, or edit other scopes.
Skip missing dependencies/occupied claims and continue another independent task.
Antigravity: no formatting/lint or standalone build/package; build goes to Codex.
Copilot: H01 owns hygiene only on completed exact-file handoffs under claim rules.
Stop only when no available work remains or the client session ends.
Save completion/blocked reasons; the same command resumes from packets next time.
```

Run the selector again only after finishing/submitting a task or a real input change; never use it in a polling/sleep loop. `--all` lists the current available queue without claiming. The helper selects metadata and claims; it does not execute task code, launch clients, send notifications or auto-restart a stopped session.

## Execution rules

1. Packet/claim state overrides stale table labels. A current DONE/PARTIAL submission is skipped until a fresh functional correction or explicit RETRY arrives. Old changes_requested decisions do not apply to a newer submitted fix.
2. Missing local export paths mean skip that task. New TypeScript feature modules expose an `index.ts` entry point. Components define local exported props/types without waiting for root IPC; they propose shared contract changes rather than editing frozen contracts.
3. A changed own snapshot must be checked and freshly submitted. Do not resubmit a known defect unchanged just to refresh its hash.
4. Each task finishes with submit + release. Claims returned by the helper include root-wiring for Codex shared integration; release both. Do not release another owner claim.
5. H01 uses producer claim plus root-wiring for explicitly handed-off shared files. No active source rewriting, version upgrades, semantic auto-fixes or immutable-packet edits.
6. One blocked item cannot hold up independent work. Explicitly blocked packets are not retried until Codex sets RETRY after a real prerequisite change. No polling.
7. No module is shipped merely because it is submitted. Codex reviews code and does root wiring/build. Native acceptance is separate, using explicit user-triggered synthetic scenarios.

## Functional coverage

[Feature-to-task matrix](FUNCTION-MAP.md) covers every F01-F34 inventory row, including unknowns/exclusions. Existing [MVP score](PROGRESS.md) remains its original acceptance baseline; this broader roadmap does not silently change the percentage denominator. Broader function parity must be accepted separately before any version increase or UI polish phase.

## Antigravity: A01-A38 (A13 superseded)

38 task definitions (A13 inactive; A38 recurring peer review); current submitted/accepted tasks are skipped. A11-A33 functional modules excluding inactive A13 provide independent UI/domain/native-core work; A34-A37 compose them in isolated workspaces. No standalone build, lint or formatting.

| Task | Deliverable | Files | Prerequisite |
| --- | --- | --- | --- |
| A01 | Capture panel | `src/features/capture/**` | Independent local module / existing named exports |
| A02 | Session library panel | `src/features/library/**` | Independent local module / existing named exports |
| A03 | Ferby settings panel | `src/features/settings/**` | Independent local module / existing named exports |
| A04 | Editor interaction view | `src/features/editor/view/**` | Independent local module / existing named exports |
| A05 | Pin and preview presentation | `src/features/pin/**` | Independent local module / existing named exports |
| A06 | Editor toolbar | `src/features/editor/toolbar/**` | Independent local module / existing named exports |
| A07 | Composed editor workbench | `src/features/editor/workbench/**` | Independent local module / existing named exports |
| A08 | Annotation bitmap renderer | `src/features/editor/render/**; tests/e2e/antigravity-render.spec.ts` | Independent local module / existing named exports |
| A09 | Standalone settings persistence crate | `src-tauri/crates/settings-core/**` | Independent local module / existing named exports |
| A10 | Controlled export options panel | `src/features/export-panel/**` | Independent local module / existing named exports |
| A11 | OCR result controls | `src/features/ocr-panel/**` | Independent local module / existing named exports |
| A12 | QR recognition controls | `src/features/qr-panel/**` | Independent local module / existing named exports |
| A13 | Historical Swift prototype: SUPERSEDED by A33 | `native/vision-core/**` | Independent local module / existing named exports |
| A14 | Clipboard image import core | `src-tauri/crates/clipboard-import-core/**` | Independent local module / existing named exports |
| A15 | Post-capture preview controller | `src/features/capture-preview/**` | Independent local module / existing named exports |
| A16 | Ellipse and line drawing primitives | `src/features/shapes/**` | Independent local module / existing named exports |
| A17 | Text and counter annotation controls | `src/features/text-counter/**` | Independent local module / existing named exports |
| A18 | Highlight spotlight magnifier renderer | `src/features/emphasis/**; tests/e2e/antigravity-emphasis.spec.ts` | Independent local module / existing named exports |
| A19 | Concealment and erase pixel core | `src-tauri/crates/effects-core/**` | Independent local module / existing named exports |
| A20 | Backdrop composition renderer | `src/features/backdrop/**; tests/e2e/antigravity-backdrop.spec.ts` | Independent local module / existing named exports |
| A21 | Multi-image composition | `src/features/composition/**; tests/e2e/antigravity-composition.spec.ts` | Independent local module / existing named exports |
| A22 | Scrolling frame stitching core | `src-tauri/crates/scroll-core/**` | Independent local module / existing named exports |
| A23 | Scrolling capture controls | `src/features/scroll-panel/**` | Independent local module / existing named exports |
| A24 | Post-capture action planner | `src/features/post-capture/**` | Independent local module / existing named exports |
| A25 | Shortcut assignment controls | `src/features/hotkey-panel/**` | Independent local module / existing named exports |
| A26 | Window capture appearance core | `src/features/window-appearance/**; tests/e2e/antigravity-window-appearance.spec.ts` | Independent local module / existing named exports |
| A27 | Measurement overlay controls | `src/features/measurement-panel/**` | Independent local module / existing named exports |
| A28 | Application preference controls | `src/features/app-preferences/**` | Independent local module / existing named exports |
| A29 | Local session archive core | `src-tauri/crates/session-core/**` | Independent local module / existing named exports |
| A30 | Local output and print presentation | `src/features/local-output/**; tests/e2e/antigravity-local-output.spec.ts` | Independent local module / existing named exports |
| A31 | Non-destructive automatic image adjustment | `src/features/auto-adjust/**; tests/e2e/antigravity-auto-adjust.spec.ts` | Independent local module / existing named exports |
| A32 | Selection move and resize handles | `src/features/selection-handles/**` | Independent local module / existing named exports |

| A33 | Rust-only local Vision OCR and QR core | `src-tauri/crates/vision-core/**` | No Swift; standalone Rust core |

## Copilot: P01-P57 + H01

57 feature/helper/reference/acceptance task definitions total; P43-P50 are eight bounded source-grounded comparison packs. Read only named inputs, normally <=2 files and <=150-word summaries. H01 is recurring hygiene, separate from the task count.

| Task | Deliverable | Files | Prerequisite |
| --- | --- | --- | --- |
| P01 | Color formatting utilities | `src/features/color/**` | Independent / named frozen contract |
| P02 | Measurement utilities | `src/features/measurement/**` | Independent / named frozen contract |
| P03 | Editor shortcut matching | `src/features/shortcuts/**` | Independent / named frozen contract |
| P04 | Export filename utilities | `src/features/export/names.ts; src/features/export/names.test.ts` | Independent / named frozen contract |
| P05 | Bounded baseline accessibility review | `docs/qa/copilot-P05.md` | Independent / named frozen contract |
| P06 | Fit-to-viewport utility | `src/features/viewport/fit.ts; src/features/viewport/fit.test.ts` | Independent / named frozen contract |
| P07 | Crop request validation helper | `src/features/crop/validate.ts; src/features/crop/validate.test.ts` | Independent / named frozen contract |
| P08 | Settings JSON codec | `src/features/settings-codec/index.ts; src/features/settings-codec/index.test.ts` | Independent / named frozen contract |
| P09 | Independent history regression tests | `src/testing/copilot-history.test.ts` | Independent / named frozen contract |
| P10 | Pin parameter utilities | `src/features/pin-values/index.ts; src/features/pin-values/index.test.ts` | Independent / named frozen contract |
| P11 | Native acceptance checklist | `docs/qa/copilot-native-checklist.md` | Independent / named frozen contract |
| P12 | PNG metadata header validation | `src/features/png-header/index.ts; src/features/png-header/index.test.ts` | Independent / named frozen contract |
| P13 | RGBA pixel sampling | `src/features/pixel-sample/index.ts; src/features/pixel-sample/index.test.ts` | Independent / named frozen contract |
| P14 | Client to image coordinate mapping | `src/features/point-map/index.ts; src/features/point-map/index.test.ts` | Independent / named frozen contract |
| P15 | Rectangle intersection | `src/features/rect-intersection/index.ts; src/features/rect-intersection/index.test.ts` | Independent / named frozen contract |
| P16 | Annotation bounds | `src/features/annotation-bounds/index.ts; src/features/annotation-bounds/index.test.ts` | Independent / named frozen contract |
| P17 | Session selection transitions | `src/features/session-selection/index.ts; src/features/session-selection/index.test.ts` | Independent / named frozen contract |
| P18 | Byte-size display formatting | `src/features/byte-format/index.ts; src/features/byte-format/index.test.ts` | Independent / named frozen contract |
| P19 | Stable session image sorting | `src/features/image-sort/index.ts; src/features/image-sort/index.test.ts` | Independent / named frozen contract |
| P20 | Explicit output-dimension planning | `src/features/output-size/index.ts; src/features/output-size/index.test.ts` | Independent / named frozen contract |
| P21 | OCR text normalization | `src/features/ocr-text/index.ts; src/features/ocr-text/index.test.ts` | Independent / named frozen contract |
| P22 | Clipboard adapter invalid-input regressions | `src/testing/copilot-clipboard-boundary.test.ts` | Independent / named frozen contract |
| P23 | OCR language option validation | `src/features/ocr-languages/index.ts; src/features/ocr-languages/index.test.ts` | Independent / named frozen contract |
| P24 | QR payload classification | `src/features/qr-payload/index.ts; src/features/qr-payload/index.test.ts` | Independent / named frozen contract |
| P25 | Rectangle handle resize geometry | `src/features/resize-handles/index.ts; src/features/resize-handles/index.test.ts` | Independent / named frozen contract |
| P26 | Move annotation point geometry | `src/features/move-points/index.ts; src/features/move-points/index.test.ts` | Independent / named frozen contract |
| P27 | Counter label formatting | `src/features/counter-label/index.ts; src/features/counter-label/index.test.ts` | Independent / named frozen contract |
| P28 | Annotation style value validation | `src/features/style-values/index.ts; src/features/style-values/index.test.ts` | Independent / named frozen contract |
| P29 | Snapping candidate distances | `src/features/snap-distance/index.ts; src/features/snap-distance/index.test.ts` | Independent / named frozen contract |
| P30 | Stitch frame budget planning | `src/features/stitch-budget/index.ts; src/features/stitch-budget/index.test.ts` | Independent / named frozen contract |
| P31 | Backdrop output sizing | `src/features/backdrop-size/index.ts; src/features/backdrop-size/index.test.ts` | Independent / named frozen contract |
| P32 | Color averaging helper | `src/features/average-rgba/index.ts; src/features/average-rgba/index.test.ts` | Independent / named frozen contract |
| P33 | Annotation text value bounds | `src/features/text-values/index.ts; src/features/text-values/index.test.ts` | Independent / named frozen contract |
| P34 | Capture action transition helper | `src/features/capture-state/index.ts; src/features/capture-state/index.test.ts` | Independent / named frozen contract |
| P35 | Clipboard import negative-path tests | `docs/qa/copilot-P35-clipboard-import.md` | src-tauri/crates/clipboard-import-core/src/lib.rs |
| P36 | Settings compatibility fixtures | `src/testing/copilot-settings-compat.test.ts` | Independent / named frozen contract |
| P37 | Deep-link request parser | `src/features/deep-link-parser/index.ts; src/features/deep-link-parser/index.test.ts` | Independent / named frozen contract |
| P38 | Export name collision sequence | `src/features/export-sequence/index.ts; src/features/export-sequence/index.test.ts` | Independent / named frozen contract |
| P39 | Preview timeout state | `src/features/preview-timer/index.ts; src/features/preview-timer/index.test.ts` | Independent / named frozen contract |
| P40 | Print page geometry | `src/features/print-geometry/index.ts; src/features/print-geometry/index.test.ts` | Independent / named frozen contract |
| P41 | Parity test case inventory | `src/testing/parity-cases.json; src/testing/copilot-parity-cases.test.ts` | Independent / named frozen contract |
| P42 | Functional regression triage | `docs/qa/copilot-P42-triage.md` | Independent / named frozen contract |

## Codex integration path

Codex implements C17-C22 and owns C04/C07-C16 review/integration/acceptance. Workers build modules and proposals; Codex owns shared contracts, app/IPC/window registration, capability/dependency wiring, actual preference effects and integration builds. All shared writes acquire root-wiring plus the task claim.

| Task | Integration | Required modules |
| --- | --- | --- |
| C04 | Review and integrate available modules | coordination/reviews/INDEX.md |
| C07 | Editor and raster-export integration | A04/A06/A07/A08/A10 |
| C08 | Native clipboard import and local OCR bridge | A33 Rust Vision/A14 and P23/P24 |
| C09 | Restricted pin/preview windows | A05/A15/P10/P39 |
| C10 | Settings persistence and actual preference effects | A03/A09/A24/A28/P08 |
| C11 | User-triggered scrolling and capture modes | A22/A23/P30/P34 |
| C12 | Annotation/effect/backdrop/composition integration | A16-A21/A26/A27 |
| C13 | Global shortcut and app lifecycle wiring | A25/A28 |
| C14 | Explicit local archive integration | A29 |
| C15 | Deep links, print and user-initiated drag | A30/P37/P40 |
| C16 | Functional parity acceptance and release gate | all feature-map owners |

## Where details live

Exact task work/acceptance: `coordination/build-tasks.json` and the individual role prompt sections. Claims: `coordination/claims/`. Completion packets: `coordination/reviews/submissions/`. Decisions/index: Codex-owned. Candidate module absence is not permission to copy its scope into another role.

If the known queue is exhausted, publish a final status and stop. Unknown target behavior, unavailable SDKs or user-only native acceptance may require a later decision; do not invent results or keep generating busywork.

Native language update: no Swift implementation/compiler/runtime helpers. A33 Rust Vision replaces A13; the old Swift source is preserved as reference only.

## Source-grounded composition and verification wave

See [original baseline and parity rules](ORIGIN-PARITY.md). These tasks do not imply acceptance or raise MVP progress. Worker modules remain isolated until Codex review/integration. No Swift.

| Task | Agent | Deliverable | Owned paths |
| --- | --- | --- | --- |
| A34 | antigravity | Composed advanced editor module | `src/features/editor/advanced-workbench/**; tests/e2e/antigravity-advanced-workbench.spec.ts` |
| A35 | antigravity | Composed post-capture workflow | `src/features/capture-workflow/**` |
| A36 | antigravity | Composed image layout workspace | `src/features/layout-workspace/**; tests/e2e/antigravity-layout-workspace.spec.ts` |
| A37 | antigravity | Composed capability-aware preferences workspace | `src/features/preferences-workspace/**` |
| P43 | copilot | Source-grounded parity cases: capture | `docs/qa/parity/P43.json; docs/qa/parity/P43.md` |
| P44 | copilot | Source-grounded parity cases: recognition-import | `docs/qa/parity/P44.json; docs/qa/parity/P44.md` |
| P45 | copilot | Source-grounded parity cases: annotation-history | `docs/qa/parity/P45.json; docs/qa/parity/P45.md` |
| P46 | copilot | Source-grounded parity cases: effects-colors | `docs/qa/parity/P46.json; docs/qa/parity/P46.md` |
| P47 | copilot | Source-grounded parity cases: composition-background | `docs/qa/parity/P47.json; docs/qa/parity/P47.md` |
| P48 | copilot | Source-grounded parity cases: pin-library-preview | `docs/qa/parity/P48.json; docs/qa/parity/P48.md` |
| P49 | copilot | Source-grounded parity cases: output | `docs/qa/parity/P49.json; docs/qa/parity/P49.md` |
| P50 | copilot | Source-grounded parity cases: lifecycle-exclusions | `docs/qa/parity/P50.json; docs/qa/parity/P50.md` |

## Three-agent implementation and joint acceptance

[Complete delivery plan and 100% gate](DELIVERY-PLAN.md) supersedes earlier integration-only Codex role wording. Codex implements C17-C22 before the review backlog. Antigravity reviews Codex through A38. Copilot completes bounded independent regressions and H01; P57 captures the final candidate. No self-approval or automatic Git operations.

| Task | Owner | Deliverable | Scope |
| --- | --- | --- | --- |
| C17 | codex | Capture session controller | `src/features/capture-session/**` |
| C18 | codex | Recognition job controller | `src/features/recognition-workflow/**` |
| C19 | codex | Output job orchestration | `src/features/output-jobs/**` |
| C20 | codex | Local archive workflow controller | `src/features/archive-workflow/**` |
| C21 | codex | Application lifecycle and action policy | `src/features/lifecycle-policy/**` |
| C22 | codex | Bounded native image effects pipeline | `src-tauri/crates/effects-pipeline/**` |
| A38 | antigravity | Recurring independent review of Codex and Copilot packets | `coordination/reviews/peer/** (new antigravity records only); docs/agents/antigravity/A38-*.md` |
| P51 | copilot | Independent capture-session negative-path regressions | `src/testing/copilot-capture-session.test.ts; docs/qa/copilot-P51.md` |
| P52 | copilot | Independent recognition-workflow negative-path regressions | `src/testing/copilot-recognition-workflow.test.ts; docs/qa/copilot-P52.md` |
| P53 | copilot | Independent output-jobs negative-path regressions | `src/testing/copilot-output-jobs.test.ts; docs/qa/copilot-P53.md` |
| P54 | copilot | Independent archive-workflow negative-path regressions | `src/testing/copilot-archive-workflow.test.ts; docs/qa/copilot-P54.md` |
| P55 | copilot | Independent lifecycle-policy negative-path regressions | `src/testing/copilot-lifecycle-policy.test.ts; docs/qa/copilot-P55.md` |
| P56 | copilot | Independent Rust effects pipeline acceptance audit | `docs/qa/copilot-P56.md` |
| P57 | copilot | Frozen final release candidate evidence manifest | `coordination/release/candidate.json; docs/qa/copilot-P57.md` |

## Production backlog refresh: P78-P81

Continue available P78-P81 after current claims: auto-adjust controls and bounded app/hotkey/print preference codecs. Each task has two named inputs and isolated outputs in build-tasks.json. No review waiting, expanded tests or root writes; Codex performs integration.
