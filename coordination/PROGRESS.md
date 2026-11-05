# Project progress

**61.25% accepted against the declared MVP baseline** (rounded: 61%). Updated: 2026-11-05.

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
| Local OCR | 10% | 0/4 | 0% |
| Quality and release | 10% | 2/4 | 5% |

## Current work and blockers

- C01-C03/C05/C06 are preserved. Current integration checkpoints: C07 editor/raster, C08 clipboard import, C09 native pin and C10 format/quality preferences; broader tasks remain partial.
- Antigravity A33 Rust Vision replaces inactive Swift A13. Current reviewed editor/pin/settings/clipboard modules are connected; further feature modules await integration review.
- Copilot continues P01-P42 and H01; immutable current packet decisions are authoritative, not historical table labels.
- Codex verification: 195 frontend unit tests, 22 selected browser E2E and 16 root Rust tests passed at this checkpoint. Native manual acceptance remains open; source/version checks preserve the 0.1.0 baseline.
- Progress rose from 47.5% to 61.25% through composed editor/rendering, tested settings persistence core and restricted pin/controls implementation. No native manual gate or OCR gate was credited.
- Continuous task lists cover Antigravity A01-A33 (A13 superseded) and Copilot P01-P42 + H01. The selector skips submitted work and superseded tasks; clients are not auto-launched or restarted.
- Scrolling/effects/global hotkeys/archive/print and Rust OCR/QR remain on the broader functional roadmap; review/integration and user-only native acceptance still prevent parity/release claims.

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

- [ ] Bounded engine contract/core.
- [ ] Synthetic text recognition tests.
- [ ] UI/copy integration.
- [ ] Native acceptance and failure handling.

### Quality and release

- [x] Automated frontend/Rust regression baseline. [Evidence](../docs/agents/codex/C05-validation.md).
- [x] Local debug app bundle. [Evidence](../docs/agents/codex/C05-validation.md).
- [ ] Native manual acceptance matrix.
- [ ] Release build/signing/distribution decision.

## Update procedure

Codex edits `coordination/progress.json` with concrete accepted-gate evidence, then runs `rtk proxy python3 scripts/project_progress.py`. Use `--check` to verify the generated document is current. Scope changes require an explicit baseline revision; do not quietly remove unfinished gates to raise the score.
