# Product build queue

> Temporary staffing (2026-11-05): use [the two-agent allocation](TWO-LANE.md). Only Codex and Copilot run while Antigravity is unavailable; Codex also takes over free Axx production/fixes; P58-P69 provide bounded independent QA. Existing independent/final acceptance gates remain unchanged.


0.1.0 function roadmap: **Antigravity A01-A38 (A13 superseded)**, **Copilot P01-P57 + H01**, Codex C01-C22 (preserve completed work). Version/dependency upgrades and broad UI polish remain gated on functional acceptance.

[Continuous dispatcher and full work lists](CONTINUOUS.md) | [Feature coverage](FUNCTION-MAP.md) | [Progress](PROGRESS.md) | [Review inbox](reviews/INDEX.md)

Antigravity performs scoped functional tests, no format/lint or standalone build/package. Copilot owns H01 hygiene under explicit completed-file claims. Codex reviews/wires/builds and does not run format/lint. Submitted-current work is skipped; workers do not wait for review or native wiring to build local modules.

This table reserves ownership; actual completion/decisions/claims drive `scripts/next_task.py`. COORD05 reserves coordination docs and the selector/tests for Codex. Shared source writers also acquire root-wiring.

| Task | Agent | Scope | Owned paths | Recorded state |
| --- | --- | --- | --- | --- |
| C01 | codex | Annotation model and history | `src/features/editor/model/**` | DONE |
| C02 | codex | macOS capture core | `src-tauri/crates/capture-core/**` | DONE |
| C03 | codex | Image transform and export core | `src-tauri/crates/image-core/**` | DONE |
| C04 | codex | Review and integrate available modules | `src/Workspace.*; src/platform/**; src-tauri/src/**; root manifests/configs/lockfiles` | PARTIAL |
| C05 | codex | Foundation regression and native boundary hardening | `tests/e2e/codex-regressions.spec.ts; src/platform/**; src-tauri/src/**` | DONE |
| A01 | antigravity | Capture panel | `src/features/capture/**` | APPROVED_INTEGRATED |
| A02 | antigravity | Session library panel | `src/features/library/**` | APPROVED_INTEGRATED |
| A03 | antigravity | Ferby settings panel | `src/features/settings/**` | APPROVED_PRESENTATION |
| A04 | antigravity | Editor interaction view | `src/features/editor/view/**` | APPROVED_VIEW |
| A05 | antigravity | Pin and preview presentation | `src/features/pin/**` | APPROVED_PRESENTATION |
| P01 | copilot | Color formatting utilities | `src/features/color/**` | APPROVED |
| P02 | copilot | Measurement utilities | `src/features/measurement/**` | APPROVED |
| P03 | copilot | Editor shortcut matching | `src/features/shortcuts/**` | APPROVED |
| P04 | copilot | Export filename utilities | `src/features/export/names.ts; src/features/export/names.test.ts` | APPROVED |
| P05 | copilot | Bounded baseline accessibility review | `docs/qa/copilot-P05.md` | APPROVED_STATIC |
| A06 | antigravity | Editor toolbar | `src/features/editor/toolbar/**` | NEEDS_FRESH_PACKET |
| A07 | antigravity | Composed editor workbench | `src/features/editor/workbench/**` | NEEDS_FRESH_PACKET |
| A08 | antigravity | Annotation bitmap renderer | `src/features/editor/render/**; tests/e2e/antigravity-render.spec.ts` | NEEDS_FRESH_PACKET |
| A09 | antigravity | Standalone settings persistence crate | `src-tauri/crates/settings-core/**` | NEEDS_FRESH_PACKET |
| A10 | antigravity | Controlled export options panel | `src/features/export-panel/**` | NEEDS_FRESH_PACKET |
| P06 | copilot | Fit-to-viewport utility | `src/features/viewport/fit.ts; src/features/viewport/fit.test.ts` | APPROVED |
| P07 | copilot | Crop request validation helper | `src/features/crop/validate.ts; src/features/crop/validate.test.ts` | APPROVED_INTEGRATED |
| P08 | copilot | Settings JSON codec | `src/features/settings-codec/index.ts; src/features/settings-codec/index.test.ts` | APPROVED |
| P09 | copilot | Independent history regression tests | `src/testing/copilot-history.test.ts` | APPROVED |
| P10 | copilot | Pin parameter utilities | `src/features/pin-values/index.ts; src/features/pin-values/index.test.ts` | APPROVED |
| P11 | copilot | Native acceptance checklist | `docs/qa/copilot-native-checklist.md` | CHANGES_REQUESTED |
| C06 | codex | Native image clipboard copy | `src/Workspace.*; src/platform/**; src-tauri/src/**; src-tauri/Cargo.toml; src-tauri/Cargo.lock; src-tauri/crates/image-core/src/lib.rs; tests/e2e/codex-clipboard.spec.ts` | DONE |
| P12 | copilot | PNG metadata header validation | `src/features/png-header/index.ts; src/features/png-header/index.test.ts` | CHANGES_REQUESTED |
| P13 | copilot | RGBA pixel sampling | `src/features/pixel-sample/index.ts; src/features/pixel-sample/index.test.ts` | APPROVED_INTEGRATED |
| P14 | copilot | Client to image coordinate mapping | `src/features/point-map/index.ts; src/features/point-map/index.test.ts` | APPROVED_INTEGRATED |
| P15 | copilot | Rectangle intersection | `src/features/rect-intersection/index.ts; src/features/rect-intersection/index.test.ts` | APPROVED |
| P16 | copilot | Annotation bounds | `src/features/annotation-bounds/index.ts; src/features/annotation-bounds/index.test.ts` | CHANGES_REQUESTED |
| P17 | copilot | Session selection transitions | `src/features/session-selection/index.ts; src/features/session-selection/index.test.ts` | CHANGES_REQUESTED |
| P18 | copilot | Byte-size display formatting | `src/features/byte-format/index.ts; src/features/byte-format/index.test.ts` | READY |
| P19 | copilot | Stable session image sorting | `src/features/image-sort/index.ts; src/features/image-sort/index.test.ts` | READY |
| P20 | copilot | Explicit output-dimension planning | `src/features/output-size/index.ts; src/features/output-size/index.test.ts` | READY |
| P21 | copilot | OCR text normalization | `src/features/ocr-text/index.ts; src/features/ocr-text/index.test.ts` | READY |
| P22 | copilot | Clipboard adapter invalid-input regressions | `src/testing/copilot-clipboard-boundary.test.ts` | READY |
| A11 | antigravity | OCR result controls | `src/features/ocr-panel/**` | READY |
| A12 | antigravity | QR recognition controls | `src/features/qr-panel/**` | READY |
| A13 | antigravity | Historical Swift prototype, superseded by A33 | `native/vision-core/**` | SUPERSEDED |
| A14 | antigravity | Clipboard image import core | `src-tauri/crates/clipboard-import-core/**` | READY |
| A15 | antigravity | Post-capture preview controller | `src/features/capture-preview/**` | READY |
| A16 | antigravity | Ellipse and line drawing primitives | `src/features/shapes/**` | READY |
| A17 | antigravity | Text and counter annotation controls | `src/features/text-counter/**` | READY |
| A18 | antigravity | Highlight spotlight magnifier renderer | `src/features/emphasis/**; tests/e2e/antigravity-emphasis.spec.ts` | READY |
| A19 | antigravity | Concealment and erase pixel core | `src-tauri/crates/effects-core/**` | READY |
| A20 | antigravity | Backdrop composition renderer | `src/features/backdrop/**; tests/e2e/antigravity-backdrop.spec.ts` | READY |
| A21 | antigravity | Multi-image composition | `src/features/composition/**; tests/e2e/antigravity-composition.spec.ts` | READY |
| A22 | antigravity | Scrolling frame stitching core | `src-tauri/crates/scroll-core/**` | READY |
| A23 | antigravity | Scrolling capture controls | `src/features/scroll-panel/**` | READY |
| A24 | antigravity | Post-capture action planner | `src/features/post-capture/**` | READY |
| A25 | antigravity | Shortcut assignment controls | `src/features/hotkey-panel/**` | READY |
| A26 | antigravity | Window capture appearance core | `src/features/window-appearance/**; tests/e2e/antigravity-window-appearance.spec.ts` | READY |
| A27 | antigravity | Measurement overlay controls | `src/features/measurement-panel/**` | READY |
| A28 | antigravity | Application preference controls | `src/features/app-preferences/**` | READY |
| A29 | antigravity | Local session archive core | `src-tauri/crates/session-core/**` | READY |
| A30 | antigravity | Local output and print presentation | `src/features/local-output/**; tests/e2e/antigravity-local-output.spec.ts` | READY |
| P23 | copilot | OCR language option validation | `src/features/ocr-languages/index.ts; src/features/ocr-languages/index.test.ts` | READY |
| P24 | copilot | QR payload classification | `src/features/qr-payload/index.ts; src/features/qr-payload/index.test.ts` | READY |
| P25 | copilot | Rectangle handle resize geometry | `src/features/resize-handles/index.ts; src/features/resize-handles/index.test.ts` | READY |
| P26 | copilot | Move annotation point geometry | `src/features/move-points/index.ts; src/features/move-points/index.test.ts` | READY |
| P27 | copilot | Counter label formatting | `src/features/counter-label/index.ts; src/features/counter-label/index.test.ts` | READY |
| P28 | copilot | Annotation style value validation | `src/features/style-values/index.ts; src/features/style-values/index.test.ts` | READY |
| P29 | copilot | Snapping candidate distances | `src/features/snap-distance/index.ts; src/features/snap-distance/index.test.ts` | READY |
| P30 | copilot | Stitch frame budget planning | `src/features/stitch-budget/index.ts; src/features/stitch-budget/index.test.ts` | READY |
| P31 | copilot | Backdrop output sizing | `src/features/backdrop-size/index.ts; src/features/backdrop-size/index.test.ts` | READY |
| P32 | copilot | Color averaging helper | `src/features/average-rgba/index.ts; src/features/average-rgba/index.test.ts` | READY |
| P33 | copilot | Annotation text value bounds | `src/features/text-values/index.ts; src/features/text-values/index.test.ts` | READY |
| P34 | copilot | Capture action transition helper | `src/features/capture-state/index.ts; src/features/capture-state/index.test.ts` | READY |
| P35 | copilot | Clipboard import negative-path tests | `docs/qa/copilot-P35-clipboard-import.md` | READY |
| P36 | copilot | Settings compatibility fixtures | `src/testing/copilot-settings-compat.test.ts` | READY |
| P37 | copilot | Deep-link request parser | `src/features/deep-link-parser/index.ts; src/features/deep-link-parser/index.test.ts` | READY |
| P38 | copilot | Export name collision sequence | `src/features/export-sequence/index.ts; src/features/export-sequence/index.test.ts` | READY |
| P39 | copilot | Preview timeout state | `src/features/preview-timer/index.ts; src/features/preview-timer/index.test.ts` | READY |
| P40 | copilot | Print page geometry | `src/features/print-geometry/index.ts; src/features/print-geometry/index.test.ts` | READY |
| P41 | copilot | Parity test case inventory | `src/testing/parity-cases.json; src/testing/copilot-parity-cases.test.ts` | READY |
| P42 | copilot | Functional regression triage | `docs/qa/copilot-P42-triage.md` | READY |
| C07 | codex | Editor and raster-export integration | `src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts` | READY |
| C08 | codex | Native clipboard import and local OCR bridge | `src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts` | READY |
| C09 | codex | Restricted pin/preview windows | `src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts` | READY |
| C10 | codex | Settings persistence and actual preference effects | `src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts` | READY |
| C11 | codex | User-triggered scrolling and capture modes | `src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts` | READY |
| C12 | codex | Annotation/effect/backdrop/composition integration | `src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts` | READY |
| C13 | codex | Global shortcut and app lifecycle wiring | `src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts` | READY |
| C14 | codex | Explicit local archive integration | `src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts` | READY |
| C15 | codex | Deep links, print and user-initiated drag | `src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts` | READY |
| C16 | codex | Functional parity acceptance and release gate | `src/Workspace.*; src/platform/**; src/contracts/**; src-tauri/src/**; root manifests/capabilities/configs/lockfiles; tests/e2e/codex-*.spec.ts` | READY |
| A31 | antigravity | Non-destructive automatic image adjustment | `src/features/auto-adjust/**; tests/e2e/antigravity-auto-adjust.spec.ts` | READY |
| A32 | antigravity | Selection move and resize handles | `src/features/selection-handles/**` | READY |

H01 is the recurring Copilot formatting/lint lane, not an extra feature task. No root/shared writes without explicit file-list handoff and root-wiring/producer claims. Do not overwrite active files.

Run `rtk proxy python3 scripts/next_task.py --agent antigravity --all` or the Copilot equivalent for the current available list. One selection is one task, one packet, then release and continue. No sleep/poll loops. Missing prerequisites lead to another task.

No upload/cloud/S3, FTP (deferred), licensing gates or telemetry. The feature matrix records exclusions/unknowns explicitly.

| A33 | antigravity | Rust-only local Vision OCR and QR core | `src-tauri/crates/vision-core/**` | READY (priority) |

No Swift implementation/build/helper is active. C08 OCR waits for a current reviewed A33 packet; historical prototype files remain reference-only.

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
