# Copilot implementation prompts

## Implementation-first priority (latest user instruction, 2026-11-05)

Codex and the existing Copilot client work in parallel on distinct file claims. Prioritize completing in-scope function logic/configuration and provisional app wiring. New tests, broad regression batches, hygiene and validation-only backlog are deferred until the implementation pass is ready; record tests as NOT RUN rather than passed. Necessary syntax/type/compile checks remain allowed. Do not stop implementation solely to refresh unrelated stale broad snapshots.

Current done/hash-bound producer sources may be provisionally wired while independent review is pending. This is UNREVIEWED development integration, not self-approval, acceptance or permission to ship. Known functional rejections, stale/incomplete inputs and active producer claims still block consumption. C16/P57 final acceptance and actual native/target parity gates retain their original independent/evidence requirements. No product/dependency upgrades, Swift, cloud/uploads, real captures in automated checks or proprietary-code/resource copying. Unknown original behavior remains UNKNOWN; use explicit Ferby decisions without claiming Shottr equivalence.

Copilot: finish its currently claimed task, then implement P70 RecognitionWorkspace and P71 LocalOutputWorkspace in their isolated folders using the exact queue props. Codex owns C08 native OCR/QR transport, recognition source/jobs and root integration, then broader C11-C15. No second Copilot client is started while an existing claim is active. 'Data' means in-scope feature data/configuration and logic; personal-data migration is not added by this priority change.


> Latest user allocation: Codex also executes free A01-A37 producer/fix scopes as codex; Copilot owns P58-P69 independent bounded tests. See TWO-LANE.md. No self-approval.

> Staffing update: read [TWO-LANE.md](../TWO-LANE.md) first. Antigravity is unavailable this week. Continue independent regressions P58-P61 through the selector after current P tasks; preserve H01 claims and final P57 review gates.


Use the dispatcher prompt once to execute the queue, or paste a single task prompt for bounded work. Open the same local `ferby-shottr` checkout.

## Validation ownership

Own formatting/lint via recurring H01 in addition to P01-P57. Use exact completed file lists and claims; never rewrite active files or root/shared scopes without explicit handoff. Follow the AGENTS.md validation ownership policy. Inspect hygiene handoffs at task boundaries; do not wait if none is available.

## Queue dispatcher

```text
Work in /Users/phattran/Documents/Code/Personal/ferby-shottr/ as copilot.
Read AGENTS.md, coordination/DELIVERY-PLAN.md and coordination/CONTINUOUS.md. Active queue: P01-P57 plus H01.
Run rtk proxy python3 scripts/next_task.py --agent copilot --claim.
Read only the selected task's named inputs/section, not the entire task catalogue.
For the source-grounded wave, read coordination/ORIGIN-PARITY.md once; never invent target behavior.
No Swift implementation, compilation or helper process. Use Rust for native work.
Execute its returned action: functional fix, checked snapshot refresh, or new task.
Skip current submitted work, occupied claims and missing prerequisites; no polling.
Use named inputs only, normally <=2 files and <=150-word packets. At task boundaries process new H01 completed-file handoffs; root/shared writes require root-wiring and producer claims.
After EACH task/request, submit a completion packet with exact current files,
actual checks and limitations. Release ALL returned claims, then immediately
select the next available task without waiting for review or native wiring.
Stay at 0.1.0 and frozen dependency versions. Do not change another role's scope.
Stop only when the available queue is exhausted or the client session ends;
persist results so the same dispatcher resumes without repeating completed work.
```

## P01: Color formatting utilities

```text
Execute only P01 in ferby-shottr. Agent: copilot.
Read AGENTS.md and the completion protocol. Inputs: No full evidence required.
Own only: src/features/color/**.
Implement rgbToHex and hexToRgb for integer RGB channels and #RGB/#RRGGBB. Validate ranges and reject unsupported alpha/malformed input. Pure functions only.
At most 2 implementation/test files; test boundaries, round trips and invalid input. Run targeted Vitest. Summary at most 150 words.
Claim P01 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## P02: Measurement utilities

```text
Execute only P02 in ferby-shottr. Agent: copilot.
Read AGENTS.md and the completion protocol. Inputs: src/contracts/editor.ts.
Own only: src/features/measurement/**.
Implement normalizeRect, clampPointToImage and pixelsToPoints using explicit positive display scale. Use image-pixel coordinates and reject non-finite/invalid dimensions. No display API or UI.
At most 2 implementation/test files; test reverse drag, bounds, 1x/2x scaling and invalid inputs. Run targeted Vitest. Summary at most 150 words.
Claim P02 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## P03: Editor shortcut matching

```text
Execute only P03 in ferby-shottr. Agent: copilot.
Read AGENTS.md and the completion protocol. Inputs: src/contracts/editor.ts.
Own only: src/features/shortcuts/**.
Define small editor tool key descriptors and a pure matcher returning an AnnotationTool or null. Ignore input/contenteditable focus, composition, repeats and unexpected modifiers. Do not register global listeners or OS shortcuts.
At most 2 implementation/test files; test text-input safety, composition/repeats and modifier cases. Run targeted Vitest. Summary at most 150 words.
Claim P03 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## P04: Export filename utilities

```text
Execute only P04 in ferby-shottr. Agent: copilot.
Read AGENTS.md and the completion protocol. Inputs: No full evidence required.
Own only: src/features/export/names.ts; src/features/export/names.test.ts.
Implement a pure safeExportName utility for PNG/JPEG: sanitize path separators/control characters, reject empty/dot-only names, normalize extension and bound filename length while preserving reasonable Unicode. No disk IO or overwrite behavior.
Only named files; test traversal-like names, duplicate extensions, Unicode, long names and invalid cases. Run targeted Vitest. Summary at most 150 words.
Claim P04 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## P05: Bounded baseline accessibility review

```text
Execute only P05 in ferby-shottr. Agent: copilot.
Read AGENTS.md and the completion protocol. Inputs: src/Workspace.tsx; src/Workspace.css.
Own only: docs/qa/copilot-P05.md.
Review only the runnable baseline for accessible names, focus order, disabled/error states, image alt text and narrow-window behavior. Do not scan the whole repo or modify product code.
Report at most 5 actionable findings with file/line, severity, evidence and proposed fix, at most 250 words. Separate static findings from browser-tested facts.
Claim P05 for request BUILD-20261105. Before ending, submit a packet
with changed-file snapshots, actual checks and risks through review_queue.py.
Release only your claim. If dispatched as a queue, continue the next independent
task; otherwise stop with the submission ID. Do not wait or poll.
```

## Round 2: P02 and P05 corrections, then P06-P11

Read the correction notes in `coordination/messages/copilot/20261105-codex-C04-review.md`. Do not resubmit unchanged buggy code just to refresh hashes. A stale but correct component still needs a fresh packet containing current implementation, styles and tests.

## P06: Fit-to-viewport utility

```text
Execute only P06 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: src/contracts/editor.ts (dimensions only).
Own only: src/features/viewport/fit.ts; src/features/viewport/fit.test.ts.
Implement pure fitImage(width,height,viewportWidth,viewportHeight,allowUpscale=false) returning a finite positive scale and fitted dimensions. Validate finite positive dimensions and derived arithmetic; preserve aspect ratio, no DOM/OS calls.
Acceptance: Two files maximum; targeted Vitest for portrait/landscape, no-upscale, opt-in upscale, zero/NaN/Infinity and overflow/underflow rejection. Packet summary <=150 words.
Prerequisite: independent. Skip if unavailable; continue another independent owned task.
Claim P06 for BUILD-20261105. Submit an immutable packet after this task/request, include actual checks and risks, release only your claim, then continue. Never edit root wiring/manifests/contracts or another agent scope.
```

## P07: Crop request validation helper

```text
Execute only P07 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: src/contracts/editor.ts.
Own only: src/features/crop/validate.ts; src/features/crop/validate.test.ts.
Implement pure validateCrop(rect,imageWidth,imageHeight) returning an owned safe-integer crop copy or throwing. Validate positive dimensions, nonnegative origin and overflow-safe bounds. Do not round silently; no UI/native call.
Acceptance: Two files; tests for exact edge, reverse/negative/fractional/zero, safe-integer boundaries, overflow and readonly input preservation. Targeted Vitest; <=150-word summary.
Prerequisite: independent. Skip if unavailable; continue another independent owned task.
Claim P07 for BUILD-20261105. Submit an immutable packet after this task/request, include actual checks and risks, release only your claim, then continue. Never edit root wiring/manifests/contracts or another agent scope.
```

## P08: Settings JSON codec

```text
Execute only P08 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: src/contracts/settings.ts.
Own only: src/features/settings-codec/index.ts; src/features/settings-codec/index.test.ts.
Implement pure parseSettingsJson(text) and serializeSettings(value) for version 1 envelope with frozen settings fields. Reject unknown version, wrong types/nonfinite/noninteger quality/out-of-range, cap input length. No storage or UI; document strict unknown-key policy. Return fresh values and never mutate defaults.
Acceptance: Two files; round-trip/default-copy independence, malformed/version/type/quality/length tests. No browser localStorage/native IO. Targeted Vitest; <=150-word summary.
Prerequisite: independent. Skip if unavailable; continue another independent owned task.
Claim P08 for BUILD-20261105. Submit an immutable packet after this task/request, include actual checks and risks, release only your claim, then continue. Never edit root wiring/manifests/contracts or another agent scope.
```

## P09: Independent history regression tests

```text
Execute only P09 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: src/features/editor/model/index.ts; src/contracts/editor.ts.
Own only: src/testing/copilot-history.test.ts.
Add tests ONLY against public model API: update/delete undo restores original snapshot, redo invalidated by new edit, counter allocation after undo branch, selection after delete. No implementation edits or repository scan.
Acceptance: One test file; report exact targeted Vitest command, >=4 meaningful assertions on public behavior with immutable inputs. If API defect found report it; do not repair Codex files. <=150-word summary.
Prerequisite: independent. Skip if unavailable; continue another independent owned task.
Claim P09 for BUILD-20261105. Submit an immutable packet after this task/request, include actual checks and risks, release only your claim, then continue. Never edit root wiring/manifests/contracts or another agent scope.
```

## P10: Pin parameter utilities

```text
Execute only P10 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: No evidence or native APIs needed.
Own only: src/features/pin-values/index.ts; src/features/pin-values/index.test.ts.
Implement pure normalizePinOptions for scale/opacity. Export explicit finite bounds scale 0.1..4 and opacity 0.1..1. Reject NaN/Infinity/wrong types; clamp finite numeric values; return a fresh value. No changes to Antigravity pin component.
Acceptance: Two files; default values 1/1, clamp boundaries, invalids and input immutability. Targeted Vitest; <=150-word summary. Integration remains Codex review.
Prerequisite: independent. Skip if unavailable; continue another independent owned task.
Claim P10 for BUILD-20261105. Submit an immutable packet after this task/request, include actual checks and risks, release only your claim, then continue. Never edit root wiring/manifests/contracts or another agent scope.
```

## P11: Native acceptance checklist

```text
Execute only P11 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: docs/agents/codex/C04-integration.md; docs/agents/codex/C05-validation.md.
Own only: docs/qa/copilot-native-checklist.md.
Write a <=300-word manual macOS acceptance checklist for user-triggered capture modes/cancel/permission error, crop/resize original preservation, PNG/JPEG dialog cancel and existing-file refusal. Mark NOT EXECUTED. Synthetic/isolated windows only. No actual screenshot, permission change or CLI operation of Shottr.
Acceptance: Explicit expected result per step and evidence fields to fill later; distinguish browser/mock coverage. No invented passes or full repo scans.
Prerequisite: independent. Skip if unavailable; continue another independent owned task.
Claim P11 for BUILD-20261105. Submit an immutable packet after this task/request, include actual checks and risks, release only your claim, then continue. Never edit root wiring/manifests/contracts or another agent scope.
```

## Round 3: doubled queue P12-P22

Eleven independent tasks are added to the original eleven. This doubles task count, not provider token quota or guaranteed effort. Fix open review requests before these tasks; continue without waiting for approval. Prefer existing platform/library APIs and at most two files per task; do not add root dependencies. Keep each completion summary at most 150 words.

## P12: PNG metadata header validation

```text
Execute only P12 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: No raw evidence; Uint8Array/DataView only.
Own only: src/features/png-header/index.ts; src/features/png-header/index.test.ts.
Implement readPngHeader(bytes) returning positive width/height from a complete PNG signature and 13-byte IHDR header. Validate signature, first chunk type/length, enough bytes, legal PNG dimension bounds <=2^31-1 and configurable image pixel limits using safe arithmetic. Do not allocate from claimed dimensions. State explicitly this validates a header only, not CRC/compressed pixels/full PNG validity.
Acceptance: Tests: real synthetic header, truncated/false signature/wrong first chunk, zero/huge dimensions and caller limits; do not claim successful decode.
Claim P12 for BUILD-20261105. No root edits or REA/repository-wide scans. Use current Node through nvm. Run targeted Vitest, submit an immutable current-file packet (summary <=150 words), release, then continue the next independent task. No waiting/polling.
```

## P13: RGBA pixel sampling

```text
Execute only P13 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: src/features/color/color.ts if present (optional read only).
Own only: src/features/pixel-sample/index.ts; src/features/pixel-sample/index.test.ts.
Implement sampleRgba(bytes,width,height,x,y) returning owned integer r/g/b/a. Require Uint8Array, positive safe integer dimensions, exact width*height*4 length and integer in-bounds coordinates. Use overflow-safe arithmetic; never mutate source. No canvas, display APIs or clipboard.
Acceptance: Tests: row-major channel order, transparency, last pixel, invalid byte lengths/coordinates, huge dimensions and source unchanged.
Claim P13 for BUILD-20261105. No root edits or REA/repository-wide scans. Use current Node through nvm. Run targeted Vitest, submit an immutable current-file packet (summary <=150 words), release, then continue the next independent task. No waiting/polling.
```

## P14: Client to image coordinate mapping

```text
Execute only P14 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: src/contracts/editor.ts.
Own only: src/features/point-map/index.ts; src/features/point-map/index.test.ts.
Implement mapClientPoint(point,bounds,imageSize) for explicit finite positive CSS bounds/image dimensions. Return clamped source-image coordinates without arbitrary rounding. Reject invalid/overflowing intermediate results; no DOM globals or display-scale guessing.
Acceptance: Tests: offset/scaled coordinates, outside clamping, fractional zoom, zero/nonfinite/overflow and input immutability.
Claim P14 for BUILD-20261105. No root edits or REA/repository-wide scans. Use current Node through nvm. Run targeted Vitest, submit an immutable current-file packet (summary <=150 words), release, then continue the next independent task. No waiting/polling.
```

## P15: Rectangle intersection

```text
Execute only P15 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: src/contracts/editor.ts.
Own only: src/features/rect-intersection/index.ts; src/features/rect-intersection/index.test.ts.
Implement intersectRects(a,b) returning a fresh positive intersection Rect or null for disjoint/edge-only contact. Require finite coordinates and nonnegative sizes, reject overflow in edges. Pure source-pixel geometry; do not import UI.
Acceptance: Tests: contained/partial/touching/disjoint/zero/reversed-invalid/extreme arithmetic; source inputs frozen.
Claim P15 for BUILD-20261105. No root edits or REA/repository-wide scans. Use current Node through nvm. Run targeted Vitest, submit an immutable current-file packet (summary <=150 words), release, then continue the next independent task. No waiting/polling.
```

## P16: Annotation bounds

```text
Execute only P16 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: src/contracts/editor.ts.
Own only: src/features/annotation-bounds/index.ts; src/features/annotation-bounds/index.test.ts.
Implement annotationBounds(annotation) for rectangle/arrow/pen returning finite geometric point bounds or null for no points. Validate supported tool, points and strokeWidth; include half-stroke padding. Explicitly document that arrowhead/text glyph bounds are not computed, so result is not a guaranteed painted-pixel/selection hit area. Reject unsupported tools.
Acceptance: Tests: reverse points, multi-point pen, single point, stroke padding, unsupported/NaN/overflow and immutable inputs. No renderer edits.
Claim P16 for BUILD-20261105. No root edits or REA/repository-wide scans. Use current Node through nvm. Run targeted Vitest, submit an immutable current-file packet (summary <=150 words), release, then continue the next independent task. No waiting/polling.
```

## P17: Session selection transitions

```text
Execute only P17 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: src/contracts/media.ts.
Own only: src/features/session-selection/index.ts; src/features/session-selection/index.test.ts.
Implement pure nextSelectionAfterRemove(ids,selectedId,removedId): preserve a selected survivor; if selected removed choose previous adjacent survivor, else next adjacent, else null. Reject duplicate IDs; do not mutate order. Document handling missing selected/removed IDs. No URLs, React or IO.
Acceptance: Tests: first/middle/last/only selected removal, nonselected removal, stale IDs, duplicates and frozen list. Scope at most two files.
Claim P17 for BUILD-20261105. No root edits or REA/repository-wide scans. Use current Node through nvm. Run targeted Vitest, submit an immutable current-file packet (summary <=150 words), release, then continue the next independent task. No waiting/polling.
```

## P18: Byte-size display formatting

```text
Execute only P18 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: No target evidence required.
Own only: src/features/byte-format/index.ts; src/features/byte-format/index.test.ts.
Implement formatByteSize(bytes) using explicit IEC units B/KiB/MiB/GiB, at most one fractional digit and no localization dependency. Require nonnegative safe integers; choose/document rounding policy near boundaries; zero -> 0 B. No changes to LibraryPanel.
Acceptance: Tests: zero/units/exact boundaries/rounding/MAX_SAFE_INTEGER/negative/fractional/NaN. Two files only.
Claim P18 for BUILD-20261105. No root edits or REA/repository-wide scans. Use current Node through nvm. Run targeted Vitest, submit an immutable current-file packet (summary <=150 words), release, then continue the next independent task. No waiting/polling.
```

## P19: Stable session image sorting

```text
Execute only P19 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: src/contracts/media.ts.
Own only: src/features/image-sort/index.ts; src/features/image-sort/index.test.ts.
Implement sortSessionImages(images, mode) for name-asc, name-desc and original order. Return copied array retaining original document references; deterministic code-point comparison of normalized case-insensitive names, ties preserve input order. No filesystem timestamps or mutation; no locale-dependent assertions.
Acceptance: Tests: stable ties, Unicode/case, reverse order, empty and frozen inputs; original mode preserves original sequence.
Claim P19 for BUILD-20261105. No root edits or REA/repository-wide scans. Use current Node through nvm. Run targeted Vitest, submit an immutable current-file packet (summary <=150 words), release, then continue the next independent task. No waiting/polling.
```

## P20: Explicit output-dimension planning

```text
Execute only P20 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: No native display API; plain scalar inputs only.
Own only: src/features/output-size/index.ts; src/features/output-size/index.test.ts.
Implement planOutputSize(width,height,displayScale,downscale) returning positive integer output dimensions. Require safe integer source dimensions and explicit finite positive scale. Downscale only when enabled and scale>1; use documented max(1,floor(source/scale)); never infer Retina scale from dimensions. Reject unsafe/underflow arithmetic.
Acceptance: Tests: 1x/2x/1.5x, disabled downscale, small-image minimum, invalid/huge values; do not call native screen APIs.
Claim P20 for BUILD-20261105. No root edits or REA/repository-wide scans. Use current Node through nvm. Run targeted Vitest, submit an immutable current-file packet (summary <=150 words), release, then continue the next independent task. No waiting/polling.
```

## P21: OCR text normalization

```text
Execute only P21 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: No OCR engine, evidence or network required.
Own only: src/features/ocr-text/index.ts; src/features/ocr-text/index.test.ts.
Implement normalizeOcrText(text) preserving Unicode content and paragraph structure: normalize CRLF/CR to LF, trim trailing spaces/tabs per line and trim outer blank lines. Do not collapse internal spaces, dehyphenate, execute text or alter punctuation. Cap input length and document policy.
Acceptance: Tests: Vietnamese/emoji, paragraphs, internal whitespace, newline variants, empty and oversize/wrong-type. This is postprocessing only, not working OCR.
Claim P21 for BUILD-20261105. No root edits or REA/repository-wide scans. Use current Node through nvm. Run targeted Vitest, submit an immutable current-file packet (summary <=150 words), release, then continue the next independent task. No waiting/polling.
```

## P22: Clipboard adapter invalid-input regressions

```text
Execute only P22 in ferby-shottr as copilot. Read AGENTS.md and the completion protocol.
Inputs: src/platform/native.ts; src/platform/image-limits.ts; src/contracts/media.ts.
Own only: src/testing/copilot-clipboard-boundary.test.ts.
Add tests only for copyImage adapter using mocked Tauri invoke/isTauri and synthetic image metadata. Cover browser desktop_required, invalid dimensions rejected before decode/invoke, synthetic decoder rejection never invoking native, native structured error preservation. Never instantiate/read/write actual system clipboard. Do not modify adapter source.
Acceptance: One test file with meaningful negative-path assertions, scoped Vitest command, restored stubs after each test. If defects found report instead of editing Codex files.
Claim P22 for BUILD-20261105. No root edits or REA/repository-wide scans. Use current Node through nvm. Run targeted Vitest, submit an immutable current-file packet (summary <=150 words), release, then continue the next independent task. No waiting/polling.
```

## H01: Recurring formatting/lint handoffs

```text
Work in ferby-shottr as copilot. Read AGENTS.md validation ownership.
H01 is recurring hygiene work alongside P01-P22, not an extra feature task.
Read only the exact completed task/file lists handed off to you.
Claim H01, then the producer task claim before cosmetic writes; skip occupied
or unfinished scopes without polling. Root/shared files need an explicit Codex
file list, root-wiring and source claim; otherwise checks/report only. Do not mass-format.
Own formatter/lint/whitespace checks, including cargo fmt --check, cargo clippy
and git diff --check. Use configured frontend tooling; report missing tools and
propose dependency/config wiring instead of editing root manifests yourself.
Fix cosmetic issues only. Report semantic lint findings to the source owner.
Submit fresh exact-file snapshots/results in an H01 packet, note any old
packet hashes made stale, release both claims and continue P01-P22.
Never edit immutable submissions/decisions or claim delegated checks passed.
```

## Continuous dispatch (supersedes earlier fixed queue ranges)

Read coordination/CONTINUOUS.md, then run `rtk proxy python3 scripts/next_task.py --agent copilot`. Select one task using current packet/claim state, not stale table labels. Use `--claim` to claim a selected task atomically. Fix functional reviews first, then implement independently, then review and integrate approved inputs. Submitted-current work is skipped until a new review request arrives. No polling, waiting, OS privacy changes or version upgrades. Stop only when all available tasks are submitted or blocked; save one completion packet per task/request.

## P23: OCR language option validation

```text
Execute P23 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: No repository-wide context; explicit caller-supplied language list only.
Own only: src/features/ocr-languages/index.ts; src/features/ocr-languages/index.test.ts.
Validate caller-supplied OCR language identifiers against an explicit provided supported list; no invented installed languages. Fresh normalized list, finite size/length caps; duplicates normalized with documented case policy.
Acceptance: Supported/unsupported/duplicates/empty/malformed/length/type cases; no engine/native access.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P24: QR payload classification

```text
Execute P24 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: No engine/native input; plain string API only.
Own only: src/features/qr-payload/index.ts; src/features/qr-payload/index.test.ts.
Pure classifyQrPayload(text): inert text plus safe scheme category for http/https/mailto/plain/unsupported; never execute/open anything. Cap input and reject control-character URL tricks; preserve display text.
Acceptance: Mixed-case schemes, javascript/data/file, whitespace/control and Unicode tests; no automatic links.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P25: Rectangle handle resize geometry

```text
Execute P25 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/contracts/editor.ts.
Own only: src/features/resize-handles/index.ts; src/features/resize-handles/index.test.ts.
Pure bounded source-image rectangle resizing by one of eight handles; explicit min size and image bounds. No DOM or shared model edits. Reject nonfinite/overflow inputs.
Acceptance: Every handle, reverse crossing policy, clamping/minsize/frozen input and extremes.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P26: Move annotation point geometry

```text
Execute P26 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/contracts/editor.ts.
Own only: src/features/move-points/index.ts; src/features/move-points/index.test.ts.
Pure translate/clamp readonly points within explicit image bounds using one shared delta that preserves relative geometry; reject nonfinite/overflow and impossible fit.
Acceptance: Relative distances preserved, edge clamp, multi-point and immutable input; at most two files.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P27: Counter label formatting

```text
Execute P27 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/contracts/editor.ts (counter field only).
Own only: src/features/counter-label/index.ts; src/features/counter-label/index.test.ts.
Pure positive-safe-integer counter labels with optional explicit decimal prefix/suffix; bound string length and reject invalid values. No allocation/history logic.
Acceptance: 1/max-safe, invalid/fractional, Unicode prefix/suffix and size bounds.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P28: Annotation style value validation

```text
Execute P28 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/contracts/editor.ts (AnnotationStyle only).
Own only: src/features/style-values/index.ts; src/features/style-values/index.test.ts.
Validate/copy color/strokeWidth/opacity from existing AnnotationStyle. Use explicit supported color syntax matching current renderer; no CSS execution/variable references.
Acceptance: Finite ranges, malformed color, zero/huge widths, alpha bounds and frozen input.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P29: Snapping candidate distances

```text
Execute P29 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/contracts/editor.ts (Point/Rect only).
Own only: src/features/snap-distance/index.ts; src/features/snap-distance/index.test.ts.
Pure nearest alignment candidate with explicit finite tolerance and deterministic tie order; no hidden object similarity inference. Bound candidate count.
Acceptance: Exact/tolerance/no-match/ties/overflow and immutable arrays.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P30: Stitch frame budget planning

```text
Execute P30 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: No frame bytes/native APIs; explicit integer budget inputs.
Own only: src/features/stitch-budget/index.ts; src/features/stitch-budget/index.test.ts.
Pure frame/output-height/pixel budget planner using explicit dimensions/overlap; safe integer arithmetic, reject overlimits or invalid overlap. No image bytes or capture.
Acceptance: Known overlap sums, one/many frames, zero, near-safe-integer and hard cap cases.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P31: Backdrop output sizing

```text
Execute P31 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/contracts/media.ts (dimensions only).
Own only: src/features/backdrop-size/index.ts; src/features/backdrop-size/index.test.ts.
Pure aspect/inset output dimension planner, documented rounding and pixel/work caps; never change source aspect silently.
Acceptance: Aspect/inset/exact bounds/overflow/fraction/invalid options; two files.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P32: Color averaging helper

```text
Execute P32 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/features/pixel-sample/index.ts (read only).
Own only: src/features/average-rgba/index.ts; src/features/average-rgba/index.test.ts.
Pure bounded RGBA region averaging from explicit bytes; document arithmetic mean and alpha handling, not perceptual/color-managed averaging. Reuse safe input principles of P13.
Acceptance: Synthetic opaque/transparent pixels, nonmutating region, invalid bounds and work cap.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P33: Annotation text value bounds

```text
Execute P33 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/contracts/editor.ts (text/style fields only).
Own only: src/features/text-values/index.ts; src/features/text-values/index.test.ts.
Pure text/font-size/alignment normalization for local text annotation options. Preserve literal Unicode and newlines; reject controls except tab/newline and cap bytes/characters. No HTML rendering.
Acceptance: Vietnamese/emoji/newlines, caps, font size/type/NaN and input preservation.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P34: Capture action transition helper

```text
Execute P34 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/contracts/media.ts (CaptureMode only).
Own only: src/features/capture-state/index.ts; src/features/capture-state/index.test.ts.
Pure reducer for idle/selecting/processing/ready/cancelled/failed with explicit job token; late results from old tokens are ignored. No native invocation.
Acceptance: Cancellation, stale completion, retry, duplicate starts and immutable states.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P35: Clipboard import negative-path tests

```text
Execute P35 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src-tauri/crates/clipboard-import-core/src/lib.rs (read only).
Own only: docs/qa/copilot-P35-clipboard-import.md.
Review only A14 public injectable API and propose at most five negative-path regression cases, with exact API call/expected error. Never open real clipboard or edit the crate. If A14 absent record blocked once and continue.
Acceptance: <=200 words; unavailable/not-image/oversize/invalid RGBA cases; static proposal only, no claimed execution.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: requires the named local exports; skip if absent. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P36: Settings compatibility fixtures

```text
Execute P36 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/features/settings-codec/index.ts; src/contracts/settings.ts.
Own only: src/testing/copilot-settings-compat.test.ts.
Bounded independent fixtures/tests for P08 public JSON codec: exact v1 fields, frozen defaults, unknown versions/types. Do not edit codec or native store.
Acceptance: Round-trip/malformed/Unicode/type/limit tests and explicit version boundary.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P37: Deep-link request parser

```text
Execute P37 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: No Shottr URL contract assumed; local Ferby intent types only.
Own only: src/features/deep-link-parser/index.ts; src/features/deep-link-parser/index.test.ts.
Pure parser for explicitly documented Ferby-only capture/editor route requests, strict mode/ID allowlists. Return inert proposed intent requiring UI confirmation; reject arbitrary paths, remote URLs, credentials and unknown parameters. Do not claim Shottr URL compatibility.
Acceptance: Traversal, encoding, duplicate keys, malicious schemes, unknown commands and size caps.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P38: Export name collision sequence

```text
Execute P38 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/features/export/names.ts.
Own only: src/features/export-sequence/index.ts; src/features/export-sequence/index.test.ts.
Pure suggested-basename sequence generator with explicit starting suffix and max attempts; use P04 name sanitizer. Never inspect disk or promise reservation/nonoverwrite.
Acceptance: Extensions/Unicode/caps/sequence exhaustion/invalid counters and immutable inputs.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P39: Preview timeout state

```text
Execute P39 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: No timers/globals; injected time scalars only.
Own only: src/features/preview-timer/index.ts; src/features/preview-timer/index.test.ts.
Pure deadline planner from injected current time/timeout, pause/resume/remaining bounds and explicit expired result. No real timers/globals.
Acceptance: Clock jumps/nonfinite/zero timeout/pause/resume and overflow handling.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P40: Print page geometry

```text
Execute P40 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: src/contracts/editor.ts (dimensions only).
Own only: src/features/print-geometry/index.ts; src/features/print-geometry/index.test.ts.
Pure fit to explicit page size/margins in points using explicit pixel-to-point scale. Preserve aspect, positive printable area, no printer queries.
Acceptance: Portrait/landscape/margins/1x2x/overflow and invalid inputs.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P41: Parity test case inventory

```text
Execute P41 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: coordination/FUNCTION-MAP.md (feature IDs only).
Own only: src/testing/parity-cases.json; src/testing/copilot-parity-cases.test.ts.
Write bounded machine-readable case descriptors for F01-F26 and F30-F32 from FUNCTION-MAP; IDs, synthetic fixture, trigger, expected evidence and NOT_EXECUTED native status. No execution or assumed target equivalence.
Acceptance: Validate unique IDs/feature coverage/explicit exclusions; one JSON data file plus one scoped validation test.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P42: Functional regression triage

```text
Execute P42 as copilot in ferby-shottr; read AGENTS.md and completion protocol.
Inputs: coordination/messages/copilot/20261105-codex-C04-P19-typeblock.md and latest exact Codex functional blocker message only.
Own only: docs/qa/copilot-P42-triage.md.
Read only latest exact Codex functional blocker messages and produce a <=250-word triage report with task owner, reproduction command, source location and current known/not-rechecked status. Fix only own Pxx scope under its own claim; otherwise report. No repository-wide scan or native operation.
Acceptance: No invented passes; exact blocked vs fixed evidence. Keep historical reports/packets immutable.
Validation policy: Scoped functional tests; no root wiring; hygiene only through H01.
Prerequisites: independent local module; no root/native integration required. Claim one task for BUILD-20261105, submit exact current snapshots with actual checks/limitations, release then continue the next available task. No polling. Root wiring/contracts/manifests remain Codex-only; worker standalone/local types are proposals until integrated.
```

## P43: Source-grounded parity cases: capture

Inputs: coordination/reference-briefs/P43.md; src/features/capture/CapturePanel.tsx (public API only).

Own only: `docs/qa/parity/P43.json; docs/qa/parity/P43.md`.

Extend P41 coarse feature inventory into 3-6 source-grounded comparison cases for F01, F02. Follow coordination/ORIGIN-PARITY.md case schema supplied in the dispatcher protocol. Use only the named brief/API; no full REA or repository scans. Include exact resource references, original-vs-Ferby observation procedure, null expected target result, explicit UNKNOWN or EXCLUDED status and integration owner. Existing exports are not proof of application integration. Do not execute Shottr or change product code. Report API limitations without guessing runtime behavior.

Acceptance: One JSON case pack plus <=150-word report. Required JSON case fields: id, feature_id, source_reference, source_evidence_level, fixture, trigger, target_observation_needed, ferby_observation_needed, expected_target_result (null), acceptance_rule, target_status (NOT_EXECUTED or EXCLUDED), ferby_status (NOT_EXECUTED), owner, limitations. Unique case IDs and valid assigned feature IDs. JSON parsing and field validation with standard Python is sufficient; do not add mirror tests or count cases as passed. Publish exact snapshots then continue.

Use the dispatcher task claim, publish a packet, release and continue. Read-only specification; validate JSON/links, no product build. H01 hygiene remains separate. No Swift.

## P44: Source-grounded parity cases: recognition-import

Inputs: coordination/reference-briefs/P44.md; src/features/ocr-panel/index.ts (public API only).

Own only: `docs/qa/parity/P44.json; docs/qa/parity/P44.md`.

Extend P41 coarse feature inventory into 3-6 source-grounded comparison cases for F03, F04, F05. Follow coordination/ORIGIN-PARITY.md case schema supplied in the dispatcher protocol. Use only the named brief/API; no full REA or repository scans. Include exact resource references, original-vs-Ferby observation procedure, null expected target result, explicit UNKNOWN or EXCLUDED status and integration owner. Existing exports are not proof of application integration. Do not execute Shottr or change product code. Report API limitations without guessing runtime behavior.

Acceptance: One JSON case pack plus <=150-word report. Required JSON case fields: id, feature_id, source_reference, source_evidence_level, fixture, trigger, target_observation_needed, ferby_observation_needed, expected_target_result (null), acceptance_rule, target_status (NOT_EXECUTED or EXCLUDED), ferby_status (NOT_EXECUTED), owner, limitations. Unique case IDs and valid assigned feature IDs. JSON parsing and field validation with standard Python is sufficient; do not add mirror tests or count cases as passed. Publish exact snapshots then continue.

Use the dispatcher task claim, publish a packet, release and continue. Read-only specification; validate JSON/links, no product build. H01 hygiene remains separate. No Swift.

## P45: Source-grounded parity cases: annotation-history

Inputs: coordination/reference-briefs/P45.md; src/contracts/editor.ts (public API only).

Own only: `docs/qa/parity/P45.json; docs/qa/parity/P45.md`.

Extend P41 coarse feature inventory into 3-6 source-grounded comparison cases for F06, F07, F10, F11, F13, F15. Follow coordination/ORIGIN-PARITY.md case schema supplied in the dispatcher protocol. Use only the named brief/API; no full REA or repository scans. Include exact resource references, original-vs-Ferby observation procedure, null expected target result, explicit UNKNOWN or EXCLUDED status and integration owner. Existing exports are not proof of application integration. Do not execute Shottr or change product code. Report API limitations without guessing runtime behavior.

Acceptance: One JSON case pack plus <=150-word report. Required JSON case fields: id, feature_id, source_reference, source_evidence_level, fixture, trigger, target_observation_needed, ferby_observation_needed, expected_target_result (null), acceptance_rule, target_status (NOT_EXECUTED or EXCLUDED), ferby_status (NOT_EXECUTED), owner, limitations. Unique case IDs and valid assigned feature IDs. JSON parsing and field validation with standard Python is sufficient; do not add mirror tests or count cases as passed. Publish exact snapshots then continue.

Use the dispatcher task claim, publish a packet, release and continue. Read-only specification; validate JSON/links, no product build. H01 hygiene remains separate. No Swift.

## P46: Source-grounded parity cases: effects-colors

Inputs: coordination/reference-briefs/P46.md; src/features/emphasis/index.ts (public API only).

Own only: `docs/qa/parity/P46.json; docs/qa/parity/P46.md`.

Extend P41 coarse feature inventory into 3-6 source-grounded comparison cases for F08, F09, F12, F16, F17. Follow coordination/ORIGIN-PARITY.md case schema supplied in the dispatcher protocol. Use only the named brief/API; no full REA or repository scans. Include exact resource references, original-vs-Ferby observation procedure, null expected target result, explicit UNKNOWN or EXCLUDED status and integration owner. Existing exports are not proof of application integration. Do not execute Shottr or change product code. Report API limitations without guessing runtime behavior.

Acceptance: One JSON case pack plus <=150-word report. Required JSON case fields: id, feature_id, source_reference, source_evidence_level, fixture, trigger, target_observation_needed, ferby_observation_needed, expected_target_result (null), acceptance_rule, target_status (NOT_EXECUTED or EXCLUDED), ferby_status (NOT_EXECUTED), owner, limitations. Unique case IDs and valid assigned feature IDs. JSON parsing and field validation with standard Python is sufficient; do not add mirror tests or count cases as passed. Publish exact snapshots then continue.

Use the dispatcher task claim, publish a packet, release and continue. Read-only specification; validate JSON/links, no product build. H01 hygiene remains separate. No Swift.

## P47: Source-grounded parity cases: composition-background

Inputs: coordination/reference-briefs/P47.md; src/features/composition/index.ts (public API only).

Own only: `docs/qa/parity/P47.json; docs/qa/parity/P47.md`.

Extend P41 coarse feature inventory into 3-6 source-grounded comparison cases for F14, F18, F19, F26. Follow coordination/ORIGIN-PARITY.md case schema supplied in the dispatcher protocol. Use only the named brief/API; no full REA or repository scans. Include exact resource references, original-vs-Ferby observation procedure, null expected target result, explicit UNKNOWN or EXCLUDED status and integration owner. Existing exports are not proof of application integration. Do not execute Shottr or change product code. Report API limitations without guessing runtime behavior.

Acceptance: One JSON case pack plus <=150-word report. Required JSON case fields: id, feature_id, source_reference, source_evidence_level, fixture, trigger, target_observation_needed, ferby_observation_needed, expected_target_result (null), acceptance_rule, target_status (NOT_EXECUTED or EXCLUDED), ferby_status (NOT_EXECUTED), owner, limitations. Unique case IDs and valid assigned feature IDs. JSON parsing and field validation with standard Python is sufficient; do not add mirror tests or count cases as passed. Publish exact snapshots then continue.

Use the dispatcher task claim, publish a packet, release and continue. Read-only specification; validate JSON/links, no product build. H01 hygiene remains separate. No Swift.

## P48: Source-grounded parity cases: pin-library-preview

Inputs: coordination/reference-briefs/P48.md; src/features/pin/PinPreviewCard.tsx (public API only).

Own only: `docs/qa/parity/P48.json; docs/qa/parity/P48.md`.

Extend P41 coarse feature inventory into 3-6 source-grounded comparison cases for F20, F21, F22. Follow coordination/ORIGIN-PARITY.md case schema supplied in the dispatcher protocol. Use only the named brief/API; no full REA or repository scans. Include exact resource references, original-vs-Ferby observation procedure, null expected target result, explicit UNKNOWN or EXCLUDED status and integration owner. Existing exports are not proof of application integration. Do not execute Shottr or change product code. Report API limitations without guessing runtime behavior.

Acceptance: One JSON case pack plus <=150-word report. Required JSON case fields: id, feature_id, source_reference, source_evidence_level, fixture, trigger, target_observation_needed, ferby_observation_needed, expected_target_result (null), acceptance_rule, target_status (NOT_EXECUTED or EXCLUDED), ferby_status (NOT_EXECUTED), owner, limitations. Unique case IDs and valid assigned feature IDs. JSON parsing and field validation with standard Python is sufficient; do not add mirror tests or count cases as passed. Publish exact snapshots then continue.

Use the dispatcher task claim, publish a packet, release and continue. Read-only specification; validate JSON/links, no product build. H01 hygiene remains separate. No Swift.

## P49: Source-grounded parity cases: output

Inputs: coordination/reference-briefs/P49.md; src/features/post-capture/index.ts (public API only).

Own only: `docs/qa/parity/P49.json; docs/qa/parity/P49.md`.

Extend P41 coarse feature inventory into 3-6 source-grounded comparison cases for F23, F24, F25. Follow coordination/ORIGIN-PARITY.md case schema supplied in the dispatcher protocol. Use only the named brief/API; no full REA or repository scans. Include exact resource references, original-vs-Ferby observation procedure, null expected target result, explicit UNKNOWN or EXCLUDED status and integration owner. Existing exports are not proof of application integration. Do not execute Shottr or change product code. Report API limitations without guessing runtime behavior.

Acceptance: One JSON case pack plus <=150-word report. Required JSON case fields: id, feature_id, source_reference, source_evidence_level, fixture, trigger, target_observation_needed, ferby_observation_needed, expected_target_result (null), acceptance_rule, target_status (NOT_EXECUTED or EXCLUDED), ferby_status (NOT_EXECUTED), owner, limitations. Unique case IDs and valid assigned feature IDs. JSON parsing and field validation with standard Python is sufficient; do not add mirror tests or count cases as passed. Publish exact snapshots then continue.

Use the dispatcher task claim, publish a packet, release and continue. Read-only specification; validate JSON/links, no product build. H01 hygiene remains separate. No Swift.

## P50: Source-grounded parity cases: lifecycle-exclusions

Inputs: coordination/reference-briefs/P50.md; src/features/app-preferences/index.ts (public API only).

Own only: `docs/qa/parity/P50.json; docs/qa/parity/P50.md`.

Extend P41 coarse feature inventory into 3-6 source-grounded comparison cases for F27, F28, F29, F30, F31, F32, F33, F34. Follow coordination/ORIGIN-PARITY.md case schema supplied in the dispatcher protocol. Use only the named brief/API; no full REA or repository scans. Include exact resource references, original-vs-Ferby observation procedure, null expected target result, explicit UNKNOWN or EXCLUDED status and integration owner. Existing exports are not proof of application integration. Do not execute Shottr or change product code. Report API limitations without guessing runtime behavior.

Acceptance: One JSON case pack plus <=150-word report. Required JSON case fields: id, feature_id, source_reference, source_evidence_level, fixture, trigger, target_observation_needed, ferby_observation_needed, expected_target_result (null), acceptance_rule, target_status (NOT_EXECUTED or EXCLUDED), ferby_status (NOT_EXECUTED), owner, limitations. Unique case IDs and valid assigned feature IDs. JSON parsing and field validation with standard Python is sufficient; do not add mirror tests or count cases as passed. Publish exact snapshots then continue.

Use the dispatcher task claim, publish a packet, release and continue. Read-only specification; validate JSON/links, no product build. H01 hygiene remains separate. No Swift.

## P51: Independent capture-session negative-path regressions

Inputs: src/features/capture-session/index.ts; src/contracts/media.ts.

Own only: `src/testing/copilot-capture-session.test.ts; docs/qa/copilot-P51.md`.

Read only the named public API/contract; write bounded public-API regression tests for C17. Cover 3-5 meaningful external invariants from its acceptance, especially cancellation/out-of-order failure, immutable original and duplicate side-effect suppression where applicable. Use deferred fake adapters and synthetic content. Do not read/write implementation internals or duplicate a producer test line-for-line. Do not fix producer code; report the smallest reproducible functional defect.

Acceptance: One targeted Vitest file plus <=150-word report; run only that test, state actual outcome and missing exports precisely. No real OS/clipboard/network/capture or root changes. API absence causes skip; test failure is a correction handoff, not permission to change producer files.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional tests; H01 remains separate. No Swift.

## P52: Independent recognition-workflow negative-path regressions

Inputs: src/features/recognition-workflow/index.ts; src/features/ocr-panel/index.ts.

Own only: `src/testing/copilot-recognition-workflow.test.ts; docs/qa/copilot-P52.md`.

Read only the named public API/contract; write bounded public-API regression tests for C18. Cover 3-5 meaningful external invariants from its acceptance, especially cancellation/out-of-order failure, immutable original and duplicate side-effect suppression where applicable. Use deferred fake adapters and synthetic content. Do not read/write implementation internals or duplicate a producer test line-for-line. Do not fix producer code; report the smallest reproducible functional defect.

Acceptance: One targeted Vitest file plus <=150-word report; run only that test, state actual outcome and missing exports precisely. No real OS/clipboard/network/capture or root changes. API absence causes skip; test failure is a correction handoff, not permission to change producer files.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional tests; H01 remains separate. No Swift.

## P53: Independent output-jobs negative-path regressions

Inputs: src/features/output-jobs/index.ts; src/contracts/media.ts.

Own only: `src/testing/copilot-output-jobs.test.ts; docs/qa/copilot-P53.md`.

Read only the named public API/contract; write bounded public-API regression tests for C19. Cover 3-5 meaningful external invariants from its acceptance, especially cancellation/out-of-order failure, immutable original and duplicate side-effect suppression where applicable. Use deferred fake adapters and synthetic content. Do not read/write implementation internals or duplicate a producer test line-for-line. Do not fix producer code; report the smallest reproducible functional defect.

Acceptance: One targeted Vitest file plus <=150-word report; run only that test, state actual outcome and missing exports precisely. No real OS/clipboard/network/capture or root changes. API absence causes skip; test failure is a correction handoff, not permission to change producer files.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional tests; H01 remains separate. No Swift.

## P54: Independent archive-workflow negative-path regressions

Inputs: src/features/archive-workflow/index.ts; src/contracts/media.ts.

Own only: `src/testing/copilot-archive-workflow.test.ts; docs/qa/copilot-P54.md`.

Read only the named public API/contract; write bounded public-API regression tests for C20. Cover 3-5 meaningful external invariants from its acceptance, especially cancellation/out-of-order failure, immutable original and duplicate side-effect suppression where applicable. Use deferred fake adapters and synthetic content. Do not read/write implementation internals or duplicate a producer test line-for-line. Do not fix producer code; report the smallest reproducible functional defect.

Acceptance: One targeted Vitest file plus <=150-word report; run only that test, state actual outcome and missing exports precisely. No real OS/clipboard/network/capture or root changes. API absence causes skip; test failure is a correction handoff, not permission to change producer files.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional tests; H01 remains separate. No Swift.

## P55: Independent lifecycle-policy negative-path regressions

Inputs: src/features/lifecycle-policy/index.ts; src/features/deep-link-parser/index.ts.

Own only: `src/testing/copilot-lifecycle-policy.test.ts; docs/qa/copilot-P55.md`.

Read only the named public API/contract; write bounded public-API regression tests for C21. Cover 3-5 meaningful external invariants from its acceptance, especially cancellation/out-of-order failure, immutable original and duplicate side-effect suppression where applicable. Use deferred fake adapters and synthetic content. Do not read/write implementation internals or duplicate a producer test line-for-line. Do not fix producer code; report the smallest reproducible functional defect.

Acceptance: One targeted Vitest file plus <=150-word report; run only that test, state actual outcome and missing exports precisely. No real OS/clipboard/network/capture or root changes. API absence causes skip; test failure is a correction handoff, not permission to change producer files.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional tests; H01 remains separate. No Swift.

## P56: Independent Rust effects pipeline acceptance audit

Inputs: src-tauri/crates/effects-pipeline/src/lib.rs; src-tauri/crates/effects-pipeline/Cargo.toml.

Own only: `docs/qa/copilot-P56.md`.

Review only these two files for immutable input, bounded allocation/output, ordered operations, error paths and existing-version reuse. Run the producer crate scoped functional tests if available. Report concrete uncovered failure cases and actual commands/results in <=150 words. No producer edits, root build, broad source scan or invented test result.

Acceptance: Bounded report with symbols/lines, actual scoped cargo test result or explicit unavailable reason, and up to four actionable findings. Formatting/lint only via H01.

Use the selected task claims, publish immutable snapshots, release and continue. Scoped functional audit; no new dependencies or Swift.

## P57: Frozen final release candidate evidence manifest

Inputs: coordination/release/input-manifest.json; coordination/DELIVERY-PLAN.md.

Own only: `coordination/release/candidate.json; docs/qa/copilot-P57.md`.

After current C16 final acceptance is done and independently approved, prepare a release candidate manifest that lists exact product/config/manifest/lockfile/test evidence paths with SHA-256, accepted feature gate references and explicit exclusions. Require no active implementation/root-wiring claims and no unresolved functional corrections. Snapshot individual relevant files, never raw captures/personal files or build output directories. Include those exact files in the P57 completion packet so both Codex and Antigravity review the same candidate. Never label unexecuted native tests accepted.

Acceptance: The same current P57 packet must receive independent Codex and Antigravity approval before final merge/release acceptance. Manifest must identify actual native/product checks, known limitations and evidence paths; absent/failed gates mean partial, never 100%. No Git commit/push/deployment or app installation.

Use the selected task claims, publish immutable snapshots, release and continue. Hash/JSON/evidence verification; no full raw evidence scan or OS mutation.

P57 reads and hashes only the exact individual files in the reviewed C16 input manifest. It does not scan the checkout or waive missing native acceptance.
