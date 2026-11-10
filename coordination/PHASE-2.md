# FerShot X — Phase 2 / 1.0.0

User authorization: 2026-11-09. Phase-1 MVP acceptance remains 87.50%; phase-2 acceptance starts at 0%. This is a new scope, not a retroactive completion claim. Product versions advance for substantial changes; 1.0.0 is the requested starting point. Dependency versions remain unchanged unless a concrete feature needs a reviewed addition. Subsequent bug fixes use patch versions, substantial compatible additions use minor versions, and incompatible product changes use major versions; source-only intermediate edits do not automatically bump versions.

## Two active external clients

| Owner | Tasks | Exclusive scope |
| --- | --- | --- |
| Codex | C46 branding/contracts/coordination; C47 native FTP queue and settings; C48 app integration/removals; C49 cleanup; C50 cache integration; C51 editor integration; C52 release/acceptance | Root manifests/config/icons, src/Workspace.*, src/platform/**, src/contracts/**, src-tauri/src/**, shared integration and final acceptance |
| Antigravity | A200 direct drawing/selection; A201 crop/resize; A202 effect/layout gestures | src/features/editor/**, src/features/selection-handles/**, new src/features/direct-manipulation/** and scoped tests/styles only |
| Codex takeover (Copilot inactive) | C54 reviews P200–P203 and finishes cache/QA | src/features/library/**, src/features/phase2-library/**, src-tauri/crates/local-cache/**, bounded tests and reports only |

External clients are assigned through this repository, not internally impersonated or automatically launched. Claim each task, publish a packet, release, continue. Skip occupied scopes. Codex integrates exported components and owns root changes; producers never rewrite Workspace or manifests. Read src/contracts/phase2.ts as the shared queue/cache contract. Functional tests use synthetic images and injected network/filesystem roots. Codex runs integration checks. Copilot/H01 is unavailable; no new tasks are assigned to that client.

## FTP behavior (Codex)

Read ../upload-screenshot/src/main/{uploader,queue,pathUtils}.ts and src/shared/types.ts. Eliminate watcher/stability waits: explicit Upload / Cmd+S freezes the rendered image snapshot and allocates remotePath + public URL before networking. Show/copy the predicted URL while upload is pending; pending is never success. Retries reuse the same target and bytes. Persistent queue recovers interrupted jobs without silent uploads at launch. No legacy settings/password import, credential logging or automatic remote deletion. Passwords stay in native Keychain; settings omit passwords. FTP supports the old plain FTP setup and explicit TLS. Settings are a snapshot per job; edits must not redirect an existing URL.

## Antigravity implementation handoff

A200: inspect current editor/workbench, advanced-workbench and view; implement direct pointer creation/move/resize for the supported tools, text by clicking on image, undo/redo as a single committed gesture. Preserve existing public APIs. No configuration-number-plus-Apply as the primary workflow. Escape/pointercancel rolls back; clamp image coordinates under Fit and zoom; disabled/busy prevents gestures. A201: export DirectTransformSurface from src/features/direct-manipulation/index.tsx taking {image: ImageDocument, busy: boolean, mode: 'crop'|'resize', onTransform: (options: {crop?:{x:number;y:number;width:number;height:number};resize?:{width:number;height:number}})=>void, onCancel:()=>void}; crop by drag selection/handles, resize by corner handle, commit one operation on release. A202: direct region effects and draggable composition with existing output model; document exact integration API. Publish each task separately; leave root wiring to Codex.

## Saved Copilot implementation handoff (closed; C54 owns remaining work)

P200: replace grid/list switches with Local and FTP tabs. Keep LibraryPanel existing media props, add optional ftpItems: readonly FtpQueueItem[], onRetryUpload(id), onRemoveUpload(id), onCopyUploadUrl(url), uploadedSourceIds: readonly string[]. Local shows only non-successfully-uploaded images; pending/failed sources remain recoverable. FTP mirrors old QueuePage: searchable list, status, predicted URL visibly pending, retry failed entries, copy link/remove history, selection/details; no network image fetch or remote deletion. Read ../upload-screenshot/src/renderer/pages/QueuePage.tsx. P201: standalone Rust crate local-cache with store/list/read/remove/prune under injected app-owned directory, 30-day TTL, bounded PNG bytes/count/disk, safe IDs, private permissions, no symlink traversal; never delete user originals. Persist copies for captured/imported, saved or copied nonuploaded images. Export documented API; Codex adds commands and hooks. P202: scoped panel/cache regressions. P203: inventory deletable generated phase-1 outputs and unused source using actual references; do not delete immutable review records or user data. Propose exact paths/sizes, no broad rm. Codex archives/removes audited material.

## Acceptance

See phase2-progress.json. Each gate requires working integrated behavior and actual test/manual evidence; task counts do not imply acceptance. Upload end-to-end with a real server requires an explicit human action and reports separately from injected tests. English-only means UI language; image text content is unchanged. OCR/Text Recognition is removed, including registered native commands. QR policy is recorded explicitly rather than silently advertised as OCR.

## Current staffing and release update (2026-11-09)

Copilot has no active allocation for this cycle. Its saved P200–P203 source and immutable records retain their authorship; C54 owns remaining corrections and review. Antigravity retains its active editor claim and applies new naming to its own completed scopes before publication. Codex owns remaining integration. Accepted versions may be summarized, committed and pushed to the configured upstream without renewed permission; never include unfinished producer work. All displayed product versions derive from package.json via the UI import and version:sync/version:check. No current release is declared accepted by this policy update.

## Current correction wave and FTP sharing authorization

The user accepts phase 1 at 100% and authorizes sharing the uploader's existing FTP config AND Keychain password. This supersedes the older no-legacy-account/password wording above for this explicit integration. FerShot X defaults to the configured uploader endpoint when no independent setting exists; shared mode uses the original local config/Keychain item, never renderer password values or tracked secret defaults. Real FTP remains an explicit user action. Anti now owns A203 editor rebrand/state safety, A204 transform/effect hit-target/geometry correction, A205 composition/backdrop completion; exact scopes and findings are in build-tasks.json. C51 consumes those corrected reviewed packets. Copilot is inactive.

## Latest correction: independent FTP and local logs

The user revoked shared mode. C59 copies the configured uploader profile/password once into independent FerShot X JSON/Keychain storage; normal app runtime never synchronizes with the uploader. Remove sharing/import UI and native shared-settings commands. C60 adds local structured diagnostics with copy/export/clear and bounded retention, without image/credential/request data. Earlier shared-mode descriptions are historical and superseded.


## Sole-client menu/preferences update

Codex is the only active client; external Anti and Copilot allocations are closed. Completed Anti packets remain preserved and functionally reviewed or superseded by explicit Codex corrections. C66 implements the provided quick-menu layout using supported capture, repeat, clipboard, Open File, startup, Settings and Quit actions only. Settings opens a single separate native window with General/Hotkeys/Uploading/Advanced tabs. Preferences-only command guards allow that window without exposing capture/image/cache/queue APIs. Persisted preference changes notify the main workspace; native Quit still requires its existing session confirmation. No OCR, licensing, promotion links, delayed capture or unsupported scrolling directions are added from the reference.
