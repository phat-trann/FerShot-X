# Agent instructions

## C93 manual feedback and technical diagnostics (2026-11-10)

Record explicit USER_REPORTED passes for checklist 2,3,7,8,10–22; C93 source/native retest remains pending at 85%. Edit opens at 80% of display work-area width and height regardless of image, centered; keep the inner 16:9 viewport and full-image automatic fit. All window version badges use the same fixed spacing. Two-finger wheel pans; Ctrl-wheel pinch and WebKit gesture events zoom. Escape/Command-C copy and hide Edit only after success; editable text, popovers, active gestures and crop cancellation retain their context. Restore Freehand stroke-width controls while keeping Select-only geometry manipulation. Scroll capture resolves the target under OS-provided selected coordinates, focuses it, exposes failures in Edit and reports typed no-movement/permission/coordinate failures. Error-only logs add allowlisted operation/stage/duration/frame metadata and a private readable errors.log mirror; never store raw errors, args, URLs, paths, credentials or image data. Disable interface text selection except editable fields; modestly increase UI fonts/weights without changing annotation fonts. No native compilation/build or real OS/server tests until requested.

## C92 full-image opening and Freehand Select manipulation (2026-11-10)

Full opening-image visibility takes precedence over literal 100/80 presets: use 100% when the small image fits the padded viewport, otherwise at most 80% and shrink further to Fit as required. Preserve explicit/manual zoom scrolling and 16:9 viewport geometry. Native compact Edit sizing includes chrome/padding headroom (128px allowance); common foreground restoration centers Edit/Library/Settings on opening. Native centering/geometry remain uncompiled until an authorized build. Freehand supports proportional four-corner resize/movement only in Select, with no size slider; Freehand mode disables all item/Transformer hit testing so drawing over an existing stroke creates a new stroke instead of dragging it. Blank clicks keep Freehand active. Keep other tools immediate post-draw manipulation. Provide the complete manual acceptance checklist inline as requested; acceptance remains 85%.

## C91 opening zoom and image insertion (2026-11-10)

Opening zoom uses 100% for images within 80% of the available display reference, otherwise exactly 80%; never derive the opening preset from the compact window already resized around the image. Explicit Fit remains a separate viewport calculation and wheel zoom remains manual. Add Image inserts a selectable/movable/proportionally resizable PNG layer into the current document from file or explicit native capture; no Clipboard entry, tooltip or shortcut. Preserve layers through history, crop/resize, output and Local drafts. Embedded PNG data URLs are bounded/validated (12 MiB each, 16 MP); drafts are bounded to 32 MiB and share the existing total private-cache quota with pixels. Freehand is move-only with color, no size/resize controls; blank clicks inside/outside keep it active without empty strokes. Escape/Select still work. Keep no-build and 85% acceptance; native draft quota/persistence changes require later native verification.

## C90 menu-only app and responsive editor (2026-11-10)

Keep FerShot X absent from Dock using macOS accessory/LSUIElement policy; preserve tray/window focus and standard Cmd-W/Q. Packaged main binary name is FerShot X; current installed/native behavior requires a newly authorized build. Center shared confirmation portals explicitly despite disabled Tailwind preflight. Edit Add Image offers file, clipboard and user-driven captures, preserving the current draft. Tool hints appear immediately below controls with fixed shortcuts; tool keys include B for Blur and never intercept editable fields/modals. Keep the pointer-color cell subscribed separately from Workspace, avoid per-sample layout reads, deduplicate completed cache removals with retry after failure, and avoid preview downloads on intermediate FTP updates. Load Uploading settings on first visit while retaining drafts. Remove redundant hints; keep necessary copy concise. Use current R00–R32 manual acceptance, keep no-build and 85% acceptance; renderer/source checks do not establish native performance.

## C89 Library multi-selection and click tools (2026-11-10)

Hide completed-upload banners/notices and clear document-bound upload UI on image changes. Library supports Cmd/Ctrl-click, Shift ranges and Cmd/Ctrl-A; copy FTP URLs one per line oldest first, and confirm bulk remote deletion. Local multi-copy renders editable drafts into a bounded native file-list clipboard snapshot (1–32 images, 64 MiB request/output); preserve originals/drafts and restrict the command to Library. Keep Text/Counter active across blank image clicks, creating another element; selected bodies/handles still manipulate. Shared interface font now prefers Helvetica Neue, explicitly declared in archived font evidence, with system fallbacks; this is a reference-informed design choice, not exact runtime parity. Preserve white/silver, restored surfaces, no-build and 85% acceptance. C89/root-wiring transferred after the user confirmed the earlier session stopped.

## C88 restored surfaces and native typography (2026-11-10)

Restore #232427 base/sidebar/card/glass and #303136 elevated surfaces, superseding C87 darkening. Preserve #257EFE accent, white primary/silver secondary text and #0F1216 selections. Use shared native macOS UI font tokens (-apple-system, BlinkMacSystemFont, Helvetica Neue fallback), 13px main controls, lighter small title weights and readable secondary labels. Do not change image/annotation fonts or copy font files. Reference archived Interface Builder font evidence as static observations only; runtime/exact global typography remains unverified. Keep no-build and 85% phase-2 acceptance.

## C87 editor interaction repair (2026-11-10)

Keep the drawing tool active while immediately moving/resizing its selected element; manipulation handles take precedence over drawing. Draw elsewhere to create another element; blank clicks choose Select. Select hover adds transient feedback without changing document/export colors or sampled image colors. Do not change modes mid-Konva manipulation or double-start Transformer gestures. Counter badges have an independently directed pointed corner, default bottom-left (135 degrees), with a draggable/clickable/keyboard arrow control; the number stays upright. Persist optional counterAngle through drafts and export. Radio controls share accent/dark tokens. Darken base/elevated RGB surfaces by 30% (#19191B/#222226); keep accent/white/silver and selected #0F1216 unchanged. Retain half annotation gaps (36px slots around 32px tools), calculate overflow using actual slot widths, and avoid pointer-focus style flashing. Provide the current release manual checklist; no build or real server/OS tests until explicitly requested. Phase-2 acceptance stays 85%.

## C84 shared control system (2026-11-10)

Use shared Slider, Radix Switch, Input, NativeSelect and item-selection Checkbox components across active and retained feature sources. Slider encapsulates a custom 4px filled track/16px thumb over native range semantics, retaining keyboard, pointer, forms and disabled-fieldset behavior without dependency upgrades. Toggle settings use Switch; item inclusion keeps Checkbox semantics. Preserve all callbacks and IPC payloads. Standard text/select/button controls are 32px high with 6px radius; specialized switch/checkbox/picker/geometry handles keep appropriate dimensions. Base #232427, accent #257EFE, primary white, secondary #DEDEDF; selected background #0F1216 with a thin actual border, including hover/focus. Keyboard focus uses brightness(1.15), no outline/ring. C84/root-wiring were transferred after explicit user confirmation that the earlier session stopped; preserve the handoff record and historical authorship. Keep no-build and 85% acceptance.

## C83 taller Settings (2026-11-10)

Settings opens at 532×637 logical pixels: increase the C81 default height of 490 by 30%, retaining the 532px width. Minimum size remains 532×490 for resizing; contained scrolling remains. No build until requested; native initial geometry awaits verification. Phase-2 acceptance remains 85%.

## C81 compact Settings and monthly FTP folders (2026-11-10)

Primary interface text/icons use white; #DEDEDF stays secondary. Configure a fixed FTP user/base folder (for example /s) plus a persisted monthly-folder switch. Enabled uploads append local YYMM (2611 for November 2026); freeze the effective path in the queued job so settings/month changes never retarget retries. Old mutable profiles with a valid trailing YYMM may split into base plus monthly mode; do not reinterpret frozen job snapshots. Settings defaults/minimum become 532×490 (30% smaller in each dimension), with contained scrolling. Startup remains restricted to packaged .app runs; explain unavailable state and allow status retry rather than faking support. Remove interface focus outlines/rings/visited recoloring; keep keyboard operation and subtle focus brightness. Keep no-build instruction and 85% acceptance.

## C80 persistent drawing and window polish (2026-11-10)

Remove Open Image from the Edit toolbar (tray/file loading remains) and remove active Pin UI/native registrations. Drawing tools remain active after creation; Select is only the initial/Escape default. Keep selection handles visible after creation; switch to Select to move existing elements. Add tool separators and a gap before drawing tools, fixed numeric-property widths, and consistent shared button/control/panel sizing. Hide sampled Blur/Magnifier artwork while moving/resizing, restoring/resampling after commit or cancellation. All three windows share foreground restoration; synchronize Always on top to Library too. No native compilation/build until requested; changed native behavior requires manual retest. Acceptance stays 85%.

## C79 unified interface palette (2026-11-10)

Use #232427 for the interface base, #257EFE for accents and #DEDEDF for primary text/icons across Edit, Library and Settings, independent of OS light/dark preference. Shared surface/border/muted states derive from these colors; retain distinct destructive/warning semantics and authentic image/annotation colors. Settings and shadcn tokens consume the same palette. Keep no-build instruction and 85% phase-2 acceptance.

## C77 remove image composition (2026-11-10)

Remove Compose images from the active Edit toolbar and workspace callbacks/state/direct-tools path. Preserve unrelated image edits, crop, resize and output. Historical immutable evidence and isolated legacy utilities do not imply a supported Compose entry point. Keep no-build instruction and phase-2 acceptance at 85%.

## C76 shared left-aligned window titles (2026-11-10)

Edit, Library and Settings share one custom draggable title bar with the white uploader icon and FerShot X — section title aligned left, inset for native macOS window buttons. Library/Settings use overlay hidden native titles and narrowly scoped start-dragging capability; keep other window/command restrictions. Remove duplicate Library content branding. Keep phase-2 acceptance at 85%; native overlay/drag behavior awaits an explicitly requested build and manual retest.

## C75 tool-specific manipulation (2026-11-10)

Select is the default and returns after creation/Escape. Box areas (rectangle, ellipse, highlight, spotlight, blur) use eight perimeter handles plus center movement. Lines/arrows and two-point straight pen strokes use two endpoint handles plus whole-line movement, never a bounding-box resize. Endpoint edits preserve the opposite end/style, support Shift, abort safely and enter undo/draft history only on completion. Text/counter are move-only on canvas; color and explicit font/diameter controls set size. Freehand paths and magnifiers resize proportionally with four corners; magnifiers stay circular. Expose only relevant color, stroke/font/counter size, opacity/dimming, blur strength or magnification settings; remember edited defaults by property family. No rotation controls. Keep acceptance 85% and no-build restriction; do not fabricate native acceptance.

## C74 compact toolbar and native closing (2026-11-10)

Edit has no custom close, Settings, Library, Print, rotation or standalone Crop/Resize controls. Use standard native Close Window (Command-W) for the focused window, preserving close-to-hide and draft persistence. All fixed-size tools align left and overflow into an ellipsis menu without remounting the editor. The right cluster has only live pointer color (read-only, Tab copies), Image size (resize presets/dimensions plus Crop Region) and the actual zoom percentage (click Fit). Shift constrains box/ellipse gestures and straight-line directions. All three headers use the white uploader silhouette without a background; Library/Settings headings omit the app-name repetition and description. Product display/Dock/process name is FerShot X. Keep the 85% acceptance checkpoint and no-build instruction; changed native closing/naming requires retest. Preserve old rotated drafts while removing rotation controls.

## C73 fixed image viewport and editable blur (2026-11-10)

The image viewport, not the native outer Edit window, is 16:9. Contextual properties float absolutely without affecting Fit/layout. Only Edit or Library may be visible at once; Settings is independent. Elements provide eight perimeter resize handles, a draggable center region and rotation; resizing preserves stroke settings. Blur is a nondestructive editable draft element, committed on pointer release, not an Enter-applied raster operation. Crop/Resize retain Enter confirmation. Remove prepared-PNG drag UI; use borderless grouped toolbar controls and clear title-cased hover labels. Show app icon/title on all three screens. Local double-click opens Edit; FTP double-click opens the frozen HTTPS URL in the browser. User reports the other preceding checklist items working: phase-2 acceptance is 85% USER_REPORTED/synthetic evidence, with C73 native integration and final release gates pending. Preserve no-build instruction until explicitly revoked.

## C71 editor and HTTPS preview correction (2026-11-09)

Use the uploader silhouette for the status-bar app icon; menu items stay Lucide, white, with 60% of their C70 stroke. Remove Merge annotations. Wheel zoom, immediate post-creation selection handles, geometry-correct live previews and selection-specific style controls are required. New elements inherit the last edited style. Closing the active document hides Edit without selecting an older session image. Add a dedicated native drag region. User authorizes separate HTTP Basic preview credentials following uploader logic: exact HTTPS origin matching, native Keychain storage, one-time old-profile import and no stored-secret return to the renderer. Never forward authenticated redirects or put secrets in process arguments/logs/JSON. Real preview returned HTTP 401; do not claim authenticated acceptance without evidence. Keep the no-build instruction and release publication deferral.

## Konva and resumable Local drafts (2026-11-09)

Latest user instruction: restore the uploader application symbol, retaining padded macOS tile styling. Menu glyphs are 80% of their previous geometry and have double stroke width. Use Konva/react-konva for active drawing, selection, region tools and composition. Local uses one stable identity per image and persists its bitmap plus bounded editable vector draft; raster derivatives update the same entry, and Copy/Save must never replace it with flattened output. FTP behavior stays unchanged. Remove Library search. Do not run application/native compilation, builds or bundling until the user explicitly requests it. Renderer tests and no-emit type checks may validate source; they do not establish native persistence acceptance. The prior release build was stopped; defer release publication until the changed native source can be validated. No additional external clients are active.

## Unified 1.0.0 workflow (2026-11-09)

Latest user request supersedes the old toolbar, 35% sidebar and external-link workflow. Keep one top editor toolbar, Lucide-only controls, Enter-to-apply crop/resize/blur, native region autoscroll, a 16:9 Edit window bounded to 80% of the display and a 25% Library sidebar with FTP selected by default. Successful FTP jobs retain only bounded thumbnails; full previews load over HTTPS. Remote deletion is a user-confirmed Library action, never an automatic test against a real server. Retire external links, tonal adjustment, Measure and manual scroll. Codex is the sole client. User explicitly requests the completed 1.0.0 source commit/push; distinguish checked source/internal bundle from unexecuted native/server acceptance. Never claim 100% acceptance or notarized distribution without evidence.

## Three-window workflow (2026-11-09)

Library is the visible default window with a 35% Local/FTP row list and right preview. Edit retains the main native label and opens after capture, file import or explicit Library Edit. Edit has no sidebar. Settings UI remains unchanged. Restrict library IPC to cache/queue preview and user actions; never grant it native capture or main image commands. Library Edit creates a fresh independent document from retained pixels through a bounded native inbox. Use native tray icons; Quit uses Command-Q, with no Command-Shift-Q accelerator. Hide Library/Settings temporarily during explicit user capture and restore them afterward.


## macOS workflow and UI stack (2026-11-09)

Codex owns the stopped C67/root-wiring session after explicit user handoff. Default workspace size is 80% of the active monitor work area; close hides the view while the menu process remains; Command-Q quits without the retired Close workspace workflow. Successful captured-image Copy/Save/Upload hides the editor; cancellation and failures keep it visible. Move error-only diagnostics into Settings with configurable 1–90 day retention and a user-triggered logs-folder action. Keep structured private metadata and no secrets, image data, paths or URLs. Use the installed shadcn/Radix, Tailwind, Lucide and Motion stack plus native window vibrancy; honor Apple macOS HIG, keyboard access and reduced motion. Existing autostart plugin remains the startup provider.


## Sole-client menu and preferences update (2026-11-09)

Codex is the sole active client again. Close external Antigravity allocation without deleting its submissions, reviews or authorship; assign no new Anti/Copilot work. Review completed sources and take over corrections under Codex identity. Implement the provided native menu arrangement using existing features only, and move Settings to a dedicated native window. Preserve image-command window isolation and synchronize persisted settings across windows. Report only phase-2 acceptance (currently 55%).

## Progress reporting and configurable upload names (2026-11-09)

The user requests reporting only phase-2 progress from now on; stop repeating completed phase-1 percentages. Preserve its historical acceptance records. Add a persistent FTP upload naming choice between current random names and the uploader's timestamp algorithm, grounded in its actual source. Previously queued remote names/URLs remain frozen through settings changes and retries.

## Independent FTP and local diagnostics (2026-11-09)

Latest user correction: remove shared-storage mode and import controls. Copy the uploader FTP profile once into FerShot X and store the copied password in a separate FerShot X Keychain entry. Do not read/write the uploader settings or password during normal runtime. One-time migration is authorized; never expose passwords to the renderer, source, JSON files or logs. Add a local diagnostics viewer with user-triggered copy/export/clear, bounded retention and structured non-sensitive events. No raw request arguments, image data, credentials, filenames, server URLs or arbitrary error text in diagnostics. This supersedes the shared-mode authorization below. Existing phase-1 acceptance remains 100%; phase-2 progress stays evidence-gated.

## FTP sharing and final phase-1 acceptance (2026-11-09)

User authorizes reusing the uploader app's FTP settings AND password through its existing settings file and Keychain service/account. This supersedes the earlier no-password-import/no-legacy-sharing restriction for this explicit integration only. Never log, expose to the renderer, hardcode or commit passwords. No automatic real FTP transfer in tests. Preserve unrelated old-app settings and existing queued destination snapshots. Copilot remains inactive; Antigravity receives A203–A205 corrections before C51 integration. User explicitly accepts all phase-1 behavior: record 100% USER_REPORTED manual MVP acceptance separately from the incomplete phase-2 1.0.0 scope.

## Native area capture priority (2026-11-09)

Capture Area must use direct native desktop selection and open the editor after mouse release, without a fullscreen image selection step inside the app. Remove Fixed Region; Repeat Region reuses the last successful Area selection. Never infer coordinates from a cropped bitmap or pointer guess. Preserve permission/cancel restoration and require user retest for changed native behavior.

## Release authorization and two-client staffing (2026-11-09)

Current product naming is FerShot X throughout active code, manifests, native identities, protocols, styles and user-facing documentation. Historical immutable evidence/review records and the hash-bound 0.1.0 bundle needed for manual verification preserve provenance; do not rewrite their bytes or falsify original research. Remove original-product comparisons from active product documentation. Copilot is unavailable for this cycle: assign no further tasks or hygiene work to it. Codex reviews all existing Copilot phase-2 packets and completes remaining cache/QA work under its own identity; Antigravity retains its active editor claim. Preserve historical authorship/claims. Latest explicit user authorization permits release commits and pushes: after the version has evidence-backed acceptance and no unresolved release-blocking defects, prepare a release summary, stage only reviewed completed source, commit with a meaningful version/change message and push to the configured upstream without another confirmation. Never include active producer work, secrets, private captures, raw artifacts or unrelated changes; never force-push. If rejected or credentials fail, report the actual failure. This supersedes the old blanket no-Git-operations rule for accepted releases only. Current 1.0.0 is not yet accepted, so do not publish it as a completed release.

package.json is the canonical product version. UI reads it directly; scripts/sync_version.py synchronizes the root native Cargo package/lock, Tauri metadata, npm lock and README heading. Run version:check before development/build/release. Data schema versions, historical evidence and standalone internal library versions are not product display versions. Current acceptance is phase 1 93.75%, phase 2 25%. User-reported permission/restoration and Save dialog checks passed; direct native Area/Repeat and the full native matrix await retest.


## Phase 2 authorization (2026-11-09)

The current product is FerShot X, starting at version 1.0.0. Follow coordination/PHASE-2.md and the phase-2 queue; this supersedes the 0.1.0 product-version freeze, FTP exclusion, OCR inclusion and old staffing/allocation rules. Dependency upgrades are not implied. Three external clients (Codex, Antigravity, Copilot) have distinct scopes. Codex owns FTP/native/root integration; Antigravity owns direct-manipulation editing; Copilot owns Local/FTP library and 30-day local cache. English only, remove OCR/Text Recognition and language controls. Use the user-owned upload-screenshot source as the FTP/icon reference. No automatic real server uploads in tests; inject network boundaries. Preserve credentials, personal screenshots, authorship and immutable historical records; archive obsolete generated material before deletion. Track phase-2 acceptance separately from the historical 87.50% phase-1 baseline.

## Current user request: final review, validation and UI completion (2026-11-06)

Codex is now the sole active client. Resume functional tests, type checks, builds and source review of flagged Codex/Copilot/Antigravity changes; fix defects and improve the functional UI. This supersedes earlier test/build deferrals and the UI-polish deferral. Preserve authorship, immutable records, the frozen dependency stack, privacy boundaries and exclusions. Review credit is not native or original runtime acceptance. Use REA for Shottr comparisons, retaining static/runtime distinctions.

## Latest user authorization: Anti may integrate features (2026-11-06)

External Antigravity may connect real features into the app and native backend, including Workspace/platform code, native commands, contracts, root manifests/lockfiles/capabilities/config and required functional CSS. Shared edits require BOTH its ordinary task claim and root-wiring. Acquire root-wiring before reading a shared file for modification; reread after acquiring it. If occupied, skip shared edits and continue independent module work; never remove/inherit another session claim or touch active producers. Source feature ownership and historical authorship stay preserved. Anti may update only its evidenced feature source/wiring rows under these claims; acceptance ledger and generated review index/legacy review decisions stay Codex-owned. No self-approval. Codex coordinates final assembly; root integration is no longer Codex-exclusive. Tests/builds/typechecks/setup remain NOT RUN — deferred by user. No Swift, upgrades, OS actions, uploads, telemetry or cosmetic cleanup. Older exclusive-root/producer-only text below is superseded.


## Latest full-scope allocation (2026-11-06)

The five-package split below is superseded. Follow coordination/COMPLETE-SCOPE.md: external Anti owns23 complete feature production groups A51–A73; Codex owns6 native/root groups C35–C40 plus final assembly C41. Finish current claims; preserve completed code and old authorship. This covers every non-excluded feature through100% implemented/wired source, with actual evidence per row. No tests, builds, typechecks or setup this pass. Do not stop at an arbitrary batch size or invent original/runtime parity.


## Latest allocation: two equal feature workstreams (2026-11-06)

Follow coordination/TWO-HALVES.md: external Anti owns five producer packages A46–A50; Codex owns their native/root consumers and final app assembly. Completed A43–A45 stay available for consumption. This supersedes older small-task-only allowlists below. No tests, typechecks, builds, bundling or setup this pass. Publish/release/select; missing producer exports mean another independent task, never duplicate implementation or polling.


## Latest user priority: source implementation only (2026-11-06)

Do not run tests, typechecks, compilation, builds, bundling, formatting or lint in this implementation pass. Record tests and builds NOT RUN — deferred by user. Implement and connect missing production functions, then publish/release and continue. Source review/reading APIs, evidence and dependency resolution are allowed; they are not validation or native acceptance. External Antigravity receives small independent production scopes A43–A45, never an internal impersonation. Codex reviews their actual source and keeps USER_WAIVED_REVIEW changes marked for later user overall review. Previous validation instructions below are superseded for this pass.


## Latest user priority: features before tests (2026-11-06)

The user explicitly defers test execution until the complete feature implementation pass is ready. Prioritize missing production logic and app/native wiring; do not create or execute validation-only work, test expansion, browser suites or acceptance batches in this pass. Record tests as NOT RUN — deferred by user. Necessary syntax/type/compile checks remain allowed, reported separately. Existing test evidence remains historical; this instruction does not fabricate acceptance, parity or completion. Codex review credit remains marked for later overall review. Antigravity is the external AI/client, never an internal impersonation. Preserve claims and immutable records.


## Separate Antigravity client (2026-11-06 clarification)

Antigravity is a separate AI/client operated by the user. Codex must not create an internal worker called Antigravity, submit Antigravity output or impersonate its reviews. Assign work through the repository queue/messages only; review the real client's published packets. The temporary Antigravity allocation is A39-A42, enforced by the dispatcher allowlist. Codex keeps complex feature implementation and auto-review credit marked for later user review. No automatic client launch is installed.


## Current allocation: Codex lead and bounded Antigravity work (2026-11-06)

Antigravity may resume only small independent tasks A39-A42 in the active queue. Codex reviews those actual test/report changes and owns feature logic, reverse-engineering comparison, native/root wiring, integration builds and complex corrections. Do not run A38 reviews of Codex. Codex snapshots auto-pass the review gate by explicit user authority, marked USER_WAIVED_REVIEW for later user overall review; do not fabricate peer approval or native acceptance. Codex may finish free former Copilot/Antigravity production scopes under ordinary producer claims as explicitly authorized by the user. Preserve old authorship/immutable records and skip occupied scopes. Keep the 0.1.0 stack, exclusions and privacy boundaries.

Read the original Shottr logic/evidence for the specific function being cloned; names/selectors alone are not implementation proof. Bind evidence to target.json and distinguish static instructions from runtime equivalence. Complete useful work sequentially without waiting for Anti review. Report MVP acceptance percentage before/after; do not replace missing tests/behavior with auto-review credit.


## User-authorized lead and active validation (2026-11-06)

Codex is the lead integrator. The user explicitly grants Codex-authored packets review credit (`USER_WAIVED_REVIEW`, counts as reviewed) and requires them to stay marked for later overall review. This supersedes the requirement to wait for Antigravity review of Codex code. It is user authorization, not an independent or self-authored peer approval. Preserve immutable submissions/peer records. Current hashes, functional defects, incomplete work, tests and actual native acceptance remain distinct. Copilot work still receives actual Codex functional review; P57 is not a Codex-authored packet. See reviews/policy.json and the generated overall-review backlog in reviews/INDEX.md.

Resume functional tests, browser acceptance with synthetic images/injected OS boundaries, integration checks and meaningful fixes alongside production. The user revoked the blanket test deferral. Do not end a request merely because a soft batch target is met; submit/release/select and continue useful available work. Keep formatting/lint delegated to Copilot H01. Report acceptance percentage before/after each request, changing only evidenced gates.


## Sustained parallel production (2026-11-06)

User requests more production work for both active clients while reviews wait. Aim for three useful Codex integration slices and four useful Copilot production tasks per request when inputs/scopes permit; this is scheduling guidance, not acceptance or a reason to generate filler. Finish one claim, publish/release and immediately take another independent source task. Prefer production panels/codecs and actual app/native wiring over test expansion, hygiene, review-only work or unrelated snapshot refreshes. Do not wait/poll for another client or start duplicate clients.

Copilot queue now includes P73 editor-session codec and P74 archive panel, P75 manual scroll controls, P76 effect-region panel, P77 capture preference codec. Codex integrates preview/preferences/scrolling/effects/archive using the completed APIs. Keep exact file ownership and source-ready UNREVIEWED development status. Missing original behavior remains UNKNOWN; final/native/review acceptance is still deferred, not approved.


## Implementation-first priority (latest user instruction, 2026-11-05)

Codex and the existing Copilot client work in parallel on distinct file claims. Prioritize completing in-scope function logic/configuration and provisional app wiring. New tests, broad regression batches, hygiene and validation-only backlog are deferred until the implementation pass is ready; record tests as NOT RUN rather than passed. Necessary syntax/type/compile checks remain allowed. Do not stop implementation solely to refresh unrelated stale broad snapshots.

Current done/hash-bound producer sources may be provisionally wired while independent review is pending. This is UNREVIEWED development integration, not self-approval, acceptance or permission to ship. Known functional rejections, stale/incomplete inputs and active producer claims still block consumption. C16/P57 final acceptance and actual native/target parity gates retain their original independent/evidence requirements. No product/dependency upgrades, Swift, cloud/uploads, real captures in automated checks or proprietary-code/resource copying. Unknown original behavior remains UNKNOWN; use explicit Ferby decisions without claiming Shottr equivalence.

Copilot: finish its currently claimed task, then implement P70 RecognitionWorkspace and P71 LocalOutputWorkspace in their isolated folders using the exact queue props. Codex owns C08 native OCR/QR transport, recognition source/jobs and root integration, then broader C11-C15. No second Copilot client is started while an existing claim is active. 'Data' means in-scope feature data/configuration and logic; personal-data migration is not added by this priority change.


## Scope

The user has selected **Tauri 2 + Rust**, with React/TypeScript for the frontend, to build Ferby Shottr. The earlier investigation-only restriction is superseded. Preserve the Shottr investigation as reference; do not invent unknown target behavior or copy proprietary resources/code. Omit cloud/S3 upload features for now (FTP upload is deferred to a later phase), and bypass all licensing/activation checks or nag prompts so that every feature is unlocked by default.

The unlocked-feature rule applies to Ferby's own implementation; do not alter Shottr.app, its license state or proprietary code. Upload exclusions apply to the active MVP.

## Native language policy

The latest user instruction excludes Swift implementation, Swift compilation/packaging and Swift runtime helper processes. Native functionality stays in Rust; macOS Vision OCR/QR uses the mature objc2-vision Objective-C framework bindings from Rust. A33 supersedes A13. Preserve the old Swift prototype as reference only; do not execute its old task/build/test instructions. React/TypeScript frontend and Apple system framework use remain permitted. No product/dependency version upgrades or minimum OS bump is authorized.

## Version and parity gate

Version 0.1.0 is the compatibility baseline. First reproduce the complete requested function set and verify the corresponding behavior within the frozen 0.1.0 stack; do not raise dependency or product versions, or move on to broader UI polish, until function parity is complete. Version upgrades and post-parity UI expansion are a later phase and require an explicit requirement update.

Begin with these instructions, `coordination/BUILD-QUEUE.md` and `coordination/reviews/README.md`, then only the inputs named by your task. Architecture and frozen contracts are in `docs/implementation/ARCHITECTURE.md` and `src/contracts/`. Codex implements C17-C22 and owns shared boundaries/integration; Codex and Antigravity independently review each other under coordination/DELIVERY-PLAN.md; Antigravity owns presentation/composition/rendering and the explicitly assigned standalone settings crate; Copilot owns bounded utilities/tests. The active queue reserves exact paths and supersedes older role summaries. Historical Txx research tasks remain on `coordination/BOARD.md`; new implementation tasks use Cxx/Axx/Pxx.

The user authorized installing missing development prerequisites and task-required dependencies. Prefer established, well-maintained libraries and modern ecosystem packages/crates over custom hand-rolled implementations, but keep the selected 0.1.0 stack and versions frozen until the parity gate is met. Use existing Node 26 through nvm and Rust stable, preserve the default Node 8 alias, and avoid unrelated analysis engines or global configuration changes. Root manifests, lockfiles and capability registration are owned by Codex; workers propose additions in a packet or use their owned standalone Rust crate.

All Markdown is written in English. Reply to the user in their requested language. Prefix shell commands with `rtk`; use `rtk proxy` for unsupported commands or exact output.

## Evidence discipline

- Use the `reverse-engineer-anything` skill for the packaged app and runtime investigation. Prefer advertised REA tools and their actual schemas. If MCP tools are absent, use the pinned CLI with the supported Node runtime; do not repeat setup or change global Node defaults.
- Read `evidence/target.json` before comparing findings. Bind conclusions to Shottr version/build and resource or executable hashes. Follow `coordination/ORIGIN-PARITY.md` for source-grounded comparison cases; static coverage and synthetic Ferby checks never imply original runtime parity.
- Distinguish `STATIC_OBSERVED`, `RUNTIME_VERIFIED`, `INFERRED`, and `UNKNOWN`. Do not describe a selector, label, framework dependency or filename as proof of implementation or successful behavior.
- Cite REA Evidence IDs and resource paths/object IDs. Ordinary shell observations must be labeled separately from REA output.
- Preserve tool limitations, truncation and incomplete hierarchy. Do not claim the Phase 1 inventory is exhaustive.
- Export complete Evidence before ending an MCP session if another agent needs to consume it. In-memory Evidence IDs do not transfer between independent servers.
- Store large raw JSON in `evidence/raw/`, captures in `captures/`, and copied app artifacts in `artifacts/`; these are Git-ignored. Track concise indexes and reports.

## Coordination and ownership

- Every user request must report the acceptance percentage before and after the work, as requested on 2026-11-06. Read the weighted gates in `coordination/progress.json`; identify this as MVP acceptance, separate from source implementation/integration. Do not invent increases for unreviewed wiring, compilation or task counts. If no acceptance gate changed, state the unchanged before/after percentage explicitly.

Temporary staffing update (2026-11-05): follow `coordination/TWO-LANE.md` while Antigravity is unavailable this week. Codex and Copilot remain active; Copilot additionally owns P58-P69 bounded independent regressions. The latest user request authorizes Codex to execute free Antigravity A01-A37 producer scopes under its own identity and ordinary task claims; independent self-review remains forbidden. Existing review/acceptance gates and all pre-existing claims are preserved.

- The full delivery allocation and 100% gate are in `coordination/DELIVERY-PLAN.md`. Codex also implements C17-C22. The continuous known roadmap is `coordination/CONTINUOUS.md`, with feature coverage in `coordination/FUNCTION-MAP.md`. Use `scripts/next_task.py` to select available work from current packets/claims. Role ranges are Antigravity A01-A38 (A13 superseded) and Copilot P01-P57 plus H01; old fixed-range dispatcher text is superseded. No client auto-launch/restart or polling is installed.
- All root/shared-source writers acquire the shared `root-wiring` claim plus their task claim. H01 root/shared handoffs also require `root-wiring` and the producer claim before cosmetic writes. Acquire H01, then root-wiring (shared scopes only), then the producer claim; if any claim is occupied, release already acquired own claims and skip without waiting. Release only owned claims after packet publication.
- **Before ending EVERY user request, all agents MUST publish a completion packet under `coordination/reviews/submissions/` using `scripts/review_queue.py submit`, including analysis-only, partial and blocked work.** Record summary, changed/report file snapshots, actual checks, limitations and next steps. A queue request needs a packet after each completed/partial task. Include packet IDs in the final response.
- Codex refreshes `coordination/reviews/INDEX.md` at the start/end of its requests, reviews actual code/evidence, and records decisions separately. DONE is not approval. STALE packets require a fresh submission. No agent approves its own work. Codex snapshots require Antigravity peer review. Copilot snapshots have Codex and Antigravity review; final P57 requires both on the same unchanged candidate.
- Use `scripts/review_queue.py claim/release` for new implementation tasks. Take only your reserved scope. If a claim/input is unavailable, skip to another independent task; do not wait or poll. Submit, release, then continue your queue without waiting for review.
- Codex maintains `coordination/PROGRESS.md` from `coordination/progress.json`; agents propose completed gates with evidence in their packets, never raise percentages themselves. Percentages measure the declared MVP acceptance gates, not full Shottr parity or elapsed time.
- Only Codex edits shared contracts, application/native command wiring, root manifests/lockfiles, global CSS/configuration and generated review index/legacy integration decisions. Antigravity may publish its own immutable peer review records through `scripts/peer_review.py`; it does not edit producer code or legacy decisions. Other agents work in the path boundaries in the build queue. Never touch another agent's unfinished files to make a global check pass.
- Follow `coordination/PROTOCOL.md`. Claim a task before working; do not overwrite another agent's files or Git changes.
- `coordination/BOARD.md` and `docs/phase-1-features.md` have one integrator: Codex unless a handoff explicitly changes ownership. Other agents report through their own handoff files.
- Write findings to task-specific files under `docs/agents/<agent>/` and `coordination/handoffs/<agent>/`. Use unique timestamped message filenames under `coordination/messages/<recipient>/`.
- Do not assume an agent is running because a task recommends it. No automatic cross-client dispatcher is installed.
- Use the active build queue's roles. Read research/REA only when a specific target-behavior claim requires it; normal source implementation does not need REA. Keep Copilot inputs/output bounded; no full raw evidence or repository-wide scans for a small utility task.
- Never reset, clean, force-checkout, stage or commit another agent's work. A future implementation should use distinct worktrees or explicit file ownership.

## Runtime boundaries

Use synthetic images and isolated test windows. Native screenshot APIs may be invoked in the product only after an explicit user capture action; automated tests use an injected/fake runner. Observe permissions and report actual blockers. Do not change OS privacy settings, modify Shottr.app, activate licenses, upload images, configure cloud accounts, send telemetry or alter Shottr preferences. Ferby's own controlled settings UI is an authorized implementation feature.

Only one agent may operate Shottr's interactive UI at a time. Static artifact reads may run concurrently. Acquire the shared `runtime-shottr` claim before UI automation and release it in the task handoff. Close only sessions/processes owned by the investigation.

## Validation ownership (latest user instruction)

| Responsibility | Codex | Antigravity | Copilot |
| --- | --- | --- | --- |
| Functional tests for assigned work | Yes | Yes | Yes |
| Integration/type checking and application builds | Owns | No standalone build or packaging | Only if explicitly assigned |
| Formatting, whitespace/style checks and lint | Do not run or fix | Do not run or fix | Owns through H01 |

Codex and Antigravity must not run formatters, lint, `cargo fmt`, `cargo clippy` or `git diff --check`, or spend their feature tasks on cosmetic cleanup. They report functional defects and leave hygiene to Copilot. Antigravity must not run `npm run build`, Vite production builds, `cargo build`, Tauri builds, bundling or packaging. Targeted functional tests remain required; compilation intrinsic to `cargo test`/test runners is allowed. A standalone global typecheck is not required from Antigravity; Codex performs integration type/build checks.

Completion packets must distinguish actual tests from delegated checks: `Formatting/lint delegated to Copilot H01` and, for Antigravity, `Build delegated to Codex`. These delegations are not failures or blockers and do not require waiting. Codex reviews functionality/evidence, not formatting/lint compliance, and must not send cosmetic/lint-only corrections back to Antigravity.

Copilot H01 may check explicit completed file lists across roles. Before formatting another role's completed scope, acquire H01 and that producer task's ordinary claim as `copilot` for temporary hygiene-only ownership; skip any occupied/unfinished scope. This is the sole exception to that task's usual role owner and does not permit functional edits. For root/shared files require an explicit scoped Codex handoff identifying files and the applicable source claim; otherwise report findings without writes. Do not format an entire checkout or rewrite active files. Submit a new H01 packet with exact changed snapshots and checks; changed hashes make previous packets stale until the fresh snapshot is reviewed. Never modify immutable packets/decisions.

Use configured tools and bounded file lists; `cargo clippy` and `cargo fmt --check` belong to Copilot. Frontend lint/format tools are not assumed installed: record missing configuration, propose required dependencies/config and continue available Rust/scoped hygiene. Root manifest/tool installation changes still require the integrator's normal wiring step. Do not run `--fix` for semantic changes or suppress diagnostics blindly.

This policy supersedes older task/check examples and historical role wording. It does not weaken functional acceptance or imply that delegated checks have already passed.

## Validation

Validate JSON, source links and hashes where relevant. Run meaningful scoped functional tests and only the build checks assigned by the validation ownership table; do not claim global checks passed if another in-progress module failed. Inspect `rtk git status --short`; Copilot owns `rtk git diff --check` and all formatting/lint checks. Confirm `.vscode/`, raw evidence, captures, node_modules and Rust targets remain ignored; track application manifests/lockfiles. Submit the completion packet before the final response and release only your own claims.
