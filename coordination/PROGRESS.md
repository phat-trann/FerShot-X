# Project progress

**68.75% accepted against the declared MVP baseline** (rounded: 69%). Updated: 2026-11-06.

Ferby macOS MVP v0.1: local capture/import, basic annotations, crop/resize, PNG/JPEG save, session library, settings, native pin and local OCR.

**Excluded/deferred:** Cloud/S3/upload, FTP (deferred), scrolling capture/stitching, advanced tools and full Shottr parity. Scope expansion must create a new baseline.

This is an evidence-based delivery score, not elapsed time, token consumption or full Shottr parity. Each milestone has equally weighted acceptance gates. Formula: sum(weight × accepted gates / total gates). Code existing, a DONE packet, or an isolated mock does not automatically pass a gate. Codex updates this ledger after review; workers propose evidence in completion packets. Native acceptance gates require real manual validation and remain unchecked.

| Milestone | Weight | Accepted gates | Earned |
| --- | --- | --- | --- |
| Runnable foundation | 10% | 4/4 | 10% |
| Native capture | 15% | 2/4 | 7.5% |
| Annotations and history | 20% | 3/4 | 15% |
| Crop and resize | 10% | 3/4 | 7.5% |
| PNG/JPEG export | 10% | 2/4 | 5% |
| Session library | 5% | 4/4 | 5% |
| Ferby settings | 5% | 2/4 | 2.5% |
| Native pin and preview | 5% | 3/4 | 3.75% |
| Local OCR | 10% | 3/4 | 7.5% |
| Quality and release | 10% | 2/4 | 5% |

## Current work and blockers

- Accepted MVP score increased from 61.25% to 68.75% after bounded OCR core, actual Vision synthetic recognition and app UI/copy integration evidence. Final native OCR acceptance stays open.
- User grants Codex review credit (USER_WAIVED_REVIEW); every Codex snapshot stays marked in reviews/INDEX.md for later overall review. This is not independent peer review.
- Actual validation this request: 345 frontend tests in the earlier baseline run, 16 root Rust tests, 10 Vision tests (including real framework OCR/QR), 5 existing browser acceptance checks and 2 new recognition browser checks passed. Native OS actions were mocked except Vision on synthetic images.
- Source review found the P79 JPEG-quality schema mismatch; Copilot corrected it, and five root preference-contract tests now pass. Global tsc blockers are tracked through P61/H01 handoffs; final build outcome is reported separately.
- Copilot P83-P90 add eight bounded functional regressions; Codex continues reviews, functional fixes and C14/C15 integration without waiting for peer review.
- Manual capture/permissions/export/native window acceptance, final candidate and overall review remain open. No original Shottr runtime parity or full feature completion is implied.

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
- [ ] Real mode/cancel acceptance.
- [ ] Real permission/error/window restoration acceptance.

### Annotations and history

- [x] Immutable model with tested history. [Evidence](../src/features/editor/model/README.md).
- [x] Reviewed gestures and composed UI. [Evidence](../docs/agents/codex/C07-editor-integration.md).
- [x] Bitmap renderer with real browser pixels. [Evidence](../docs/agents/codex/C07-editor-integration.md).
- [ ] Annotated export end-to-end acceptance.

### Crop and resize

- [x] Synthetic bounded Rust transforms. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Non-destructive workspace wiring. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Browser regression with real canvas and mocked IPC. [Evidence](../docs/agents/codex/C05-validation.md).
- [ ] Native GUI transform acceptance.

### PNG/JPEG export

- [x] Bounded codecs and non-clobber save core. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Typed dialog wiring with cancellation checks. [Evidence](../docs/agents/codex/C05-validation.md).
- [ ] Real dialog/existing-file acceptance.
- [ ] Annotated-pixel export acceptance.

### Session library

- [x] Multi-image session selection. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Close/reimport and URL lifecycle regression. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Reviewed search/list-grid panel integrated. [Evidence](../docs/agents/codex/C04-library-checkpoint.md).
- [x] Integrated library keyboard and empty-state acceptance. [Evidence](../docs/agents/codex/C04-library-checkpoint.md).

### Ferby settings

- [x] Reviewed controlled settings UI. [Evidence](../docs/agents/codex/C04-library-checkpoint.md).
- [x] Standalone persistence tested. [Evidence](../docs/agents/codex/C04-modules-current.md).
- [ ] Native integration and preference application.
- [ ] Restart/invalid-settings acceptance.

### Native pin and preview

- [x] Controlled pin presentation reviewed. [Evidence](../src/features/pin/PinPreviewCard.tsx).
- [x] Restricted native pin window. [Evidence](../docs/agents/codex/C09-pin-integration.md).
- [x] Clipboard and controls integration. [Evidence](../docs/agents/codex/C09-pin-integration.md).
- [ ] Native pin acceptance.

### Local OCR

- [x] Bounded engine contract/core. [Evidence](../docs/agents/codex/C08-recognition-acceptance.md).
- [x] Synthetic text recognition tests. [Evidence](../docs/agents/codex/C08-recognition-acceptance.md).
- [x] UI/copy integration. [Evidence](../docs/agents/codex/C08-recognition-acceptance.md).
- [ ] Native acceptance and failure handling.

### Quality and release

- [x] Automated frontend/Rust regression baseline. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Local debug app bundle. [Evidence](../docs/agents/codex/C05-validation.md).
- [ ] Native manual acceptance matrix.
- [ ] Release build/signing/distribution decision.

## Update procedure

Codex edits `coordination/progress.json` with concrete accepted-gate evidence, then runs `rtk proxy python3 scripts/project_progress.py`. Use `--check` to verify the generated document is current. Scope changes require an explicit baseline revision; do not quietly remove unfinished gates to raise the score.
