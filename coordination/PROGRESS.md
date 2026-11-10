# Project progress

**100% accepted against the declared MVP baseline** (rounded: 100%). Updated: 2026-11-09.

Ferby macOS MVP v0.1: local capture/import, basic annotations, crop/resize, PNG/JPEG save, session library, settings, native pin and local OCR.

**Excluded/deferred:** Cloud/S3/upload, FTP (deferred), scrolling capture/stitching, advanced tools and full Shottr parity. Scope expansion must create a new baseline.

This is an evidence-based delivery score, not elapsed time, token consumption or full feature completeness. Each milestone has equally weighted acceptance gates. Formula: sum(weight × accepted gates / total gates). Code existing, a DONE packet, or an isolated mock does not automatically pass a gate. Codex updates this ledger after review; workers propose evidence in completion packets. Native acceptance gates require real manual validation; unexecuted cases remain unchecked and user-reported results are labeled explicitly.

| Milestone | Weight | Accepted gates | Earned |
| --- | --- | --- | --- |
| Runnable foundation | 10% | 4/4 | 10% |
| Native capture | 15% | 4/4 | 15% |
| Annotations and history | 20% | 4/4 | 20% |
| Crop and resize | 10% | 4/4 | 10% |
| PNG/JPEG export | 10% | 4/4 | 10% |
| Session library | 5% | 4/4 | 5% |
| Ferby settings | 5% | 4/4 | 5% |
| Native pin and preview | 5% | 4/4 | 5% |
| Local OCR | 10% | 4/4 | 10% |
| Quality and release | 10% | 4/4 | 10% |

## Current work and blockers

- Accepted MVP score increased from 61.25% to 68.75% after bounded OCR core, actual Vision synthetic recognition and app UI/copy integration evidence. Final native OCR acceptance stays open.
- User grants Codex review credit (USER_WAIVED_REVIEW); every Codex snapshot stays marked in reviews/INDEX.md for later overall review. This is not independent peer review.
- Actual validation this request: 345 frontend tests in the earlier baseline run, 16 root Rust tests, 10 Vision tests (including real framework OCR/QR), 5 existing browser acceptance checks and 2 new recognition browser checks passed. Native OS actions were mocked except Vision on synthetic images.
- Source review found the P79 JPEG-quality schema mismatch; Copilot corrected it, and five root preference-contract tests now pass. Global tsc blockers are tracked through P61/H01 handoffs; final build outcome is reported separately.
- Copilot P83-P90 add eight bounded functional regressions; Codex continues reviews, functional fixes and C14/C15 integration without waiting for peer review.
- Manual capture/permissions/export/native window acceptance, final candidate and overall review remain open. No original Shottr runtime parity or full feature completion is implied.
- C42 resumes validation as the sole active client: 478 frontend tests, 46 browser tests and 91 Rust tests passed (615 total), frontend type/build and macOS debug app bundle passed. See docs/agents/codex/C42-final-review.md.
- C42 repaired actual eight-action shortcut/native incompatibility and frozen v2 codec mutation; exposed window appearance/shadow trim, gradient/session-image backdrop and color format controls; corrected area geometry/resource lifecycle and small-window UI accessibility.
- MVP acceptance remains 68.75%: no real native/manual acceptance gate or original Shottr runtime parity was executed. Historical USER_WAIVED_REVIEW flags and immutable external review records are preserved; regression success is not blanket overall approval.
- C43 standardizes UI with shared light tokens, library/canvas/properties layout and focus-contained settings. False preference-save success, inspector action clipping and modal action isolation were corrected; final frontend/browser suites pass.
- C44 raises accepted MVP from 68.75% to 85.00% using three actual isolated native app processes: real crop/annotated file export, native pin ownership/window controls, real Vision OCR UI, actual restart and corrupt-preference recovery. See docs/agents/codex/C44-native-acceptance.md.
- Real capture/permission restoration, system Save dialog, full manual matrix and release decision remain separate; no original Shottr runtime equality or no-bug guarantee. Native test feature is opt-in and disabled in ordinary release builds.
- C45 ordinary optimized arm64 0.1.0 app build passed, native test-driver markers absent, macOS minimum 12.0 verified. Repaired generated bundle ad-hoc resource signature; strict codesign verification passed. Local internal only, no public distribution/notarization. This accepts the release build/decision gate and raises the MVP to 87.50%.
- Remaining 12.50%: actual capture modes/cancel and permission/error/window restoration, actual Save dialog/existing-file behavior, and the completed native manual matrix. See docs/agents/codex/C45-manual-acceptance.md; unexecuted cases remain open.
- C55: user reports permission/restoration and Save dialog/existing-file checks passed; those USER_REPORTED gates add 6.25%, reaching 93.75%. Capture Area behavior rejected; native Area/Repeat correction and final matrix await user retest. No automated real capture or new release acceptance inferred.
- User explicitly confirms all phase-1 parts working and requests phase-1 completion. Remaining capture/full matrix gates accepted as USER_REPORTED. Declared phase-1 MVP is 100%; current 1.0.0 phase-2 scope remains separately incomplete (25%).

See [build queue](BUILD-QUEUE.md), [kickoff prompts](START-HERE.md), [review inbox](reviews/INDEX.md) and [C05 checks](../docs/agents/codex/C05-validation.md).

## Acceptance ledger

### Runnable foundation

- [x] Tauri/React toolchain and contracts. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Session import/preview/close. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Isolated claims and immutable review workflow. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Production frontend and local app build. [Evidence](../docs/agents/codex/C05-validation.md).

### Native capture

- [x] Fake-runner capture core. [Evidence](../docs/agents/codex/C04-integration.md).
- [x] Typed user-action native wiring. [Evidence](../docs/agents/codex/C04-integration.md).
- [x] Real mode/cancel acceptance. [Evidence](../docs/agents/codex/C56-phase1-accepted.md).
- [x] Real permission/error/window restoration acceptance. [Evidence](../docs/agents/codex/C55-area-capture.md).

### Annotations and history

- [x] Immutable model with tested history. [Evidence](../src/features/editor/model/README.md).
- [x] Reviewed gestures and composed UI. [Evidence](../docs/agents/codex/C07-editor-integration.md).
- [x] Bitmap renderer with real browser pixels. [Evidence](../docs/agents/codex/C07-editor-integration.md).
- [x] Annotated export end-to-end acceptance. [Evidence](../docs/agents/codex/C44-native-acceptance.md).

### Crop and resize

- [x] Synthetic bounded Rust transforms. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Non-destructive workspace wiring. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Browser regression with real canvas and mocked IPC. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Native GUI transform acceptance. [Evidence](../docs/agents/codex/C44-native-acceptance.md).

### PNG/JPEG export

- [x] Bounded codecs and non-clobber save core. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Typed dialog wiring with cancellation checks. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Real dialog/existing-file acceptance. [Evidence](../docs/agents/codex/C55-area-capture.md).
- [x] Annotated-pixel export acceptance. [Evidence](../docs/agents/codex/C44-native-acceptance.md).

### Session library

- [x] Multi-image session selection. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Close/reimport and URL lifecycle regression. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Reviewed search/list-grid panel integrated. [Evidence](../docs/agents/codex/C04-library-checkpoint.md).
- [x] Integrated library keyboard and empty-state acceptance. [Evidence](../docs/agents/codex/C04-library-checkpoint.md).

### Ferby settings

- [x] Reviewed controlled settings UI. [Evidence](../docs/agents/codex/C04-library-checkpoint.md).
- [x] Standalone persistence tested. [Evidence](../docs/agents/codex/C04-modules-current.md).
- [x] Native integration and preference application. [Evidence](../docs/agents/codex/C44-native-acceptance.md).
- [x] Restart/invalid-settings acceptance. [Evidence](../docs/agents/codex/C44-native-acceptance.md).

### Native pin and preview

- [x] Controlled pin presentation reviewed. [Evidence](../src/features/pin/PinPreviewCard.tsx).
- [x] Restricted native pin window. [Evidence](../docs/agents/codex/C09-pin-integration.md).
- [x] Clipboard and controls integration. [Evidence](../docs/agents/codex/C09-pin-integration.md).
- [x] Native pin acceptance. [Evidence](../docs/agents/codex/C44-native-acceptance.md).

### Local OCR

- [x] Bounded engine contract/core. [Evidence](../docs/agents/codex/C08-recognition-acceptance.md).
- [x] Synthetic text recognition tests. [Evidence](../docs/agents/codex/C08-recognition-acceptance.md).
- [x] UI/copy integration. [Evidence](../docs/agents/codex/C08-recognition-acceptance.md).
- [x] Native acceptance and failure handling. [Evidence](../docs/agents/codex/C44-native-acceptance.md).

### Quality and release

- [x] Automated frontend/Rust regression baseline. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Local debug app bundle. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Native manual acceptance matrix. [Evidence](../docs/agents/codex/C56-phase1-accepted.md).
- [x] Release build/signing/distribution decision. [Evidence](../docs/agents/codex/C45-release-decision.md).

## Update procedure

Codex edits `coordination/progress.json` with concrete accepted-gate evidence, then runs `rtk proxy python3 scripts/project_progress.py`. Use `--check` to verify the generated document is current. Scope changes require an explicit baseline revision; do not quietly remove unfinished gates to raise the score.
