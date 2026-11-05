# C04 integration checkpoint

Status: PARTIAL. Agent: Codex. Request: BUILD-20261105.

## Reviewed and connected

- C01 immutable annotation model, C02 capture core and C03 image transforms passed code review and scoped tests. C01 remains a domain module pending an approved editor view.
- P01 color and P03 shortcut utilities are accepted for their pure helper scope. P04 filename normalization is used by the native export adapter; it is a suggested filename, not a filesystem permission boundary.
- Native commands now connect capture, crop/resize and PNG/JPEG save to the workspace. Heavy decoding, capture and save-dialog work use `spawn_blocking`. An owned atomic job guard serializes operations and remains held if an IPC caller disappears. Capture owns a window-restore guard and temporary output.
- Save accepts image bytes and a suggested basename, then obtains the destination through the native save dialog. No arbitrary input/output path argument or general shell/filesystem plugin is exposed to JavaScript. Existing files are never overwritten.
- Crop and resize add a new session document and preserve the original. PNG input/output payloads have bounded encoded size and validated dimensions; browser import formats are rasterized to PNG before native processing. JPEG export uses quality 90 and flattens alpha over white.

## Review findings and deferred modules

Antigravity A01-A05 implementation snapshots became STALE after subsequent file edits. Those packets were not approved. A later A05 guidance packet contains a fresh current pin source snapshot and was reviewed for controlled presentation only; native pin wiring remains absent.

Specific fixes requested: A01's active-display label conflicts with main-display capture; A04 arrow rendering lacks an arrowhead, pointer capture/lost-capture cleanup is missing, and draft IDs can collide after remount. No worker-owned source was overwritten by Codex. Root capture entry points use the reviewed native core rather than importing stale UI modules.

P02 needs finite-result checks for arithmetic overflow. P05's decorative-alt and mandatory-focus assertions need correction; an empty decorative alt within a filename-named button and an existing role=alert are not automatically accessibility defects. Exact feedback is in the common decisions and file-messages.

No polling or waiting was used. C04 proceeds with approved cores/helpers and records missing UI integration rather than claiming full feature parity.

## Validation and limits

- Current frontend build and 43 unit tests passed; baseline browser E2E passed (2 tests).
- Root Rust tests passed (5), including real typed crop/resize processing without GUI/capture side effects; strict root clippy passed.
- C02 tests passed (7) with fake runners; C03 tests passed (10), including hostile image headers and concurrent export non-clobbering.
- No real screenshot, OS permission change, native save-dialog interaction, cloud operation or user-image capture was performed. Passing unit/browser checks does not establish native UI behavior or full WKWebView parity.
- Settings, persistent library, native pin/clipboard and annotated-pixel export remain unintegrated. Unapproved/stale modules must receive fresh review before wiring.
