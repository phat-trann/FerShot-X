# Agent instructions

## C159 notification activation hotfix and authorized 1.3.1 push (2026-11-13)

User prioritizes fixing update-notification Settings being covered by Library, then pushing immediately without waiting for CI before resuming video work. Native Reopen must not open Library while a product view is visible or while an explicit Settings activation is pending. Set a bounded five-second intent before notification work is queued and when opening Settings; clear it on Settings close/destroy, and let normal all-hidden Reopen resume after expiry. Preserve update-tab routing, native notifications and other window semantics. Publish only this hotfix as 1.3.1 via normal main push. Installed notification/window ordering remains a manual retest; no live notifications, OS permissions, credentials or updater installation in checks.

## C158 user-authorized 1.3.0 publication (2026-11-13)

User explicitly requests a new release of completed C148-C157. Synchronize 1.3.0, summarize changes, validate renderer/native compilation and safe injected regression checks, then commit/push normally to main to trigger existing ARM-only signed release CI. This request authorizes the necessary release verification and publication despite prior local-candidate gates. Preserve historical releases, existing updater key/signing identity and all real credentials/permissions. No live capture/input/server/notification/update-install actions, private-key reads, local Keychain changes, force push or manual tags. Report actual CI/publication status separately from installed acceptance.

## C157 visible Library/Edit loading (2026-11-13)

Opening Edit from Local double-click or the Edit action immediately shows an icon-only spinner on the originating row/action and a preview overlay. Keep single-click selection and FTP double-click browser behavior. Block duplicate actions until handoff completion, rather than treating enqueue success as presentation success. Carry an optional bounded transient request ID through Library inbox/document/pending presentation; native show_editor emits a Library result only after the window show attempt, with matching ID and boolean status. Never persist tokens in Local drafts or log image metadata. Failures clear loading and permit retry; a 30-second missing-result fallback prevents permanently busy Library without claiming cancellation. Edit may open before preview decoding finishes. Respect reduced motion. No build/native compile/OS/server action or publication; native handoff requires installed verification.

## C156 Library first-click activation (2026-11-13)

User clarifies Local list row needs three clicks. Preserve single-click selection, modifier multiselection, Local double-click Edit and FTP double-click browser. Enable acceptFirstMouse only for the Library native window: the pinned Tauri schema defaults to false, allowing an inactive-window activation click to be consumed before the row receives a double-click. Do not change all rows to single-click opening or alter destructive/Settings/Edit controls. This is a plausible source-level correction, not proof of the installed cause. No build/OS action/publication; installed inactive-Library double-click verification requires a later authorized native build.

## C155 Library/Edit handoff diagnostics (2026-11-13)

Local logs show library_image/FTP failures but do not prove the intermittent Local/FTP Edit failure. Close the startup handoff gap by re-draining the native inbox after event subscription succeeds; retain queued requests while renderer operations are busy and do not clear the pending flag before the live operation guard. Report listener registration failures and preserve bounded operation/duration metadata for inbox read, Edit sizing/show and image decode in both diagnostic allowlists. Never log names, IDs, paths, payloads or credentials. Keep original drafts and presentation gates. Automated cases use injected IPC only; no build/native compile, OS/server action or publication. Installed intermittent failure still requires user retest.

## C154 ellipse resize and padded multiline Text (2026-11-13)

Magnifier uses eight independent resize anchors at its source; persist separate horizontal/vertical radii for linked and legacy effects, keep detached lens center fixed and derive output radii from magnification. Freehand/images retain uniform resizing. Inline Text uses the shared Textarea with 4px padding offset around its original document anchor; Shift+Enter inserts a newline, Enter commits and Escape cancels. Match multiline line height across Konva, selection bounds and PNG export; preserve text transactions, zoom, drafts and empty-input behavior. This supersedes C153 zero-padding metrics. No build, OS/server actions or publication before user acceptance.

## C153 Fit marker and compact text line box (2026-11-13)

Fit is a small downward teardrop marker above the zoom slider, positioned using real Fit percent and the slider thumb travel (8px endpoint inset), not the full input width. Keep the fit value reactive to viewport/image changes and preserve explicit Fit/camera reset, keyboard access and popover dismissal. Inline annotation Input uses one font-size-high line box with zero padding rather than 1.2em; preserve descenders, caret, zoom, draft/output typography and transaction behavior. No build, OS/server actions or publication before acceptance.

## C152 Inline text and visible detached-lens movement (2026-11-13)

Text starts as a blank focused shared Input overlay at document coordinates, without placeholder annotation or toolbar text field. Keep live valid text in editable snapshots, one undo transaction per edit, Enter/blur commit, Escape rollback, IME-safe confirmation, repeat placement and double-click editing. Empty new text creates no saved item; clearing existing text removes it only on commit. Match annotation color/font/zoom geometry and preserve clipboard/shortcut handling inside the editor. Detached Magnifier lens drag keeps pixels/border/connector visible; only source drag/resize hides the output. No build, real OS/server actions or publication before user acceptance.

## C151 Zoom slider and explicit Fit (2026-11-13)

Clicking Edit zoom percentage opens a compact shared Slider (1–800%) with live percentage and explicit Fit action. Retain existing wheel/pinch gestures and Fit camera reset. Zoom/Resize popovers are mutually exclusive, close on outside click/document change, and Escape closes Zoom without copying/hiding the editor. Use shared controls/materials and preserve status-cell geometry. No build, OS/server actions or publication before acceptance.

## C150 Magnifier placement and manipulation visibility (2026-11-13)

Hide the active linked lens artwork/border and connector while dragging its source, dragging the lens or resizing; retain transparent hit geometry so captured drags finish normally. Restore on release/cancel without hiding other lenses or source controls. Legacy unlinked lens artwork also hides during manipulation. New lenses use a 32-document-pixel edge gap and choose the greatest-clearance cardinal side among full-lens fits; if none fit, use the roomiest side and bound the center, allowing clipped oversized output. Preserve magnification-derived size, source-owned handles, export geometry, undo/cancel and Counter tracking. No build/publication before acceptance.

## C149 Magnifier source controls and Counter drag feedback (2026-11-13)

Linked Magnifier move/resize selection belongs to its source ellipse. Lens has drag-only positioning; rendered/export radii equal source radii times magnification, while source bounds remain unchanged by zoom factor. Source movement carries its attached lens; source resize updates its derived output size. Preserve legacy unlinked lens behavior, connector clipping, draft/export, undo and cancellation. Counter selection bounds and direction handle follow live element drag, including geometryScale, and cancel restores offsets. No build/native/server actions or publication before acceptance.

## C148 Spotlight and linked elliptical Magnifier (2026-11-13)

Spotlight hides its sampled dimming during manipulation and restores on release/cancel. New magnifiers draw a bounding ellipse (Shift constrains a circle), preserve a fixed sourceCenter and optional radiusY, and show a same-size offset lens with an edge-clipped connector. Dragging the lens leaves its source fixed; source handle retargets sampling. Preserve elliptical geometry, magnification, draft/export, undo and cancellation; document transforms map both centers. Legacy circular magnifiers without new fields remain valid. Counter corner pointer angles are continuous; keyboard steps 15 degrees or Shift 1 degree. No build, native OS/server actions or publication before acceptance.

## C147 user-authorized 1.2.2 publication (2026-11-13)

User explicitly requests pushing completed C144–C146 updates and declines adding a first-launch permission flow. Synchronize 1.2.2, preserve historical assets, validate safe automated checks and commit/push normally to main to trigger ARM-only release CI. Preserve signing identity/updater key and all real permission/credential state. No OS/server/capture/update-install actions, private-key reads or manual tags; report CI publication separately from installed Settings/updater validation.

## C146 equivalent-control regression protection (2026-11-13)

Shared framed Button hover must retain its semantic border token, with enabled opacity 1 and disabled opacity .45; preserve specialized plain/recording/canvas controls and intentional semantic colors. Remove legacy accent hover borders from ordinary feature buttons. ToolHint must preserve child refs, event handlers, existing aria-describedby and keyboard shortcuts in asChild/wrapped modes. Keep pixel-snapped hints, explicit updater state and Logs Days-inline layout. Check equivalent controls across Settings/Library plus flat Edit/Resize behavior. No build, real OS/server actions or publication before user acceptance.

## C145 remove update mock and align Settings utilities (2026-11-13)

Remove C144 temporary DEV update mock; only actual updater state renders New version. Keep matched row columns. Logs folder is a labelled icon-only action after days on the retention row, outside the input label. Folder actions use shared Button styles without legacy accent-hover borders or extra secondary opacity. Tooltip positioning snaps its final left edge to device pixels without a centering transform. Preserve callbacks, disabled behavior, log autosave and explicit updater actions. No build or publication before acceptance.

## C144 Apple Silicon, isolated Settings and version UI preview (2026-11-13)

User discontinues Intel builds: release job/manifest/archive verification now targets ARM64 only while retaining historical release assets and signing/key continuity. Shared foreground presentation must show/focus only its requested window, without AppHandle::show unhiding retained views. Edit delete tool hint/title is Delete. Current/New version share the Settings row columns. User-requested temporary New version mock is DEV-only when no real update exists; its install action is disabled and no updater state/IPC is fabricated. Disable via previewUpdate=0; remove when user accepts the layout. No build/publication this pass; native Settings isolation awaits installed validation.

## C143 user-authorized 1.2.1 publication (2026-11-13)

User authorizes publishing accumulated C140–C142 changes. Sync 1.2.1, retain published 1.2.0 assets, run safe checks and commit/push normally to main to trigger the split-architecture release. Permit Blob reads in renderer connect-src for the local preview cache while preserving other CSP restrictions; exercise this under an injected browser CSP. No real OS/capture/server/update installation, private-key reads, local keychain changes or manual tags. Report push/CI status separately from installed updater acceptance.

## C142 architecture-specific releases (2026-11-13)

Future accepted releases build separate aarch64-apple-darwin and x86_64-apple-darwin apps sequentially in the existing release job/environment, merging updater entries into one draft. Preserve main version detection, certificate identity, updater key/endpoint, no notarization and manual publication gate. Verify exact CPU architecture/certificate in both built apps and each downloaded archive matched to its manifest target; require distinct signed archives and consistent installer aliases before publishing. Existing Universal releases remain immutable. No new secrets, local signing/keychain actions, build or commit/push in this follow-up; first split release and Universal-to-thin updates need CI/manual validation.

## C141 bounded FTP preview cache (2026-11-13)

Library caches successful FTP previews only in window-local memory: eight LRU entries, five-minute TTL, 64 MiB budget counting encoded bytes plus estimated decoded RGBA. Cache Blob data, with a separate owned object URL for each consumer; revoke adapter URLs after reading and consumer URLs on stale completion/selection cleanup. Share in-flight reads. Queue identity/status/update/URL changes and removed rows invalidate entries; invalidated pending reads must not refill them. Explicit Refresh clears previews and reloads the selection. Preserve Local drafts, thumbnail-only disk retention, HTTP credentials, retry/delete behavior and stale-read isolation. No build, OS/server actions or publication before user acceptance.

## C140 source cleanup and user documentation (2026-11-13)

Audit imports before retiring source; archive byte-verified copies under ignored artifacts and retain a tracked hash manifest. Preserve active functionality, native commands, credentials, user data, historical evidence and immutable packets. Library refresh requests share in-flight IO with a trailing fresh read; hidden windows skip periodic polling and refresh on visibility. Keep thumbnail memoization keyed to displayed data. README is user-facing; technical setup lives in docs/DEVELOPMENT.md. Keep version 1.2.0 until acceptance, with no build, OS/server actions or commit/push in this follow-up.

## C139 user-authorized 1.2.0 publication (2026-11-13)

The user explicitly requests updating and pushing the accumulated candidate as 1.2.0. This authorizes version synchronization, final renderer/native compilation and safe automated checks, commit and normal origin/main push for this release; earlier no-publication/no-native-compile gates do not block this requested release work. Do not run live capture/input/server/notification/install tests, read signing secrets, alter permissions or create local private identities. Preserve updater public key/certificate continuity and existing main-triggered release workflow. Review/stage only completed source, tests, pinned skill/provenance and documentation; exclude credentials, captures/build outputs and ignored archives. Native runtime/user acceptance remains distinct from automated compilation. No force push or manual tag creation; CI creates the release tag.

## C134 consistent background colors (2026-11-13)

Window bodies, headers, navigation and Library sidebar share opaque #232427. Surface aliases/material tokens reuse the common base, superseding earlier independently translucent region tints. Raised popovers/property panels consistently use #303136; inputs and selection retain #0F1216. Preserve semantic accents, authentic image colors/checkerboards, layout and interaction. No build, real OS/server actions or commit/push before user acceptance.

## C131 centered opening for every window (2026-11-13)

Edit, Library and Settings open/reopen centered in the work area of the display under the pointer, including retained windows previously moved. Use one native active-monitor/physical-center helper for startup, Edit sizing and foreground presentation. Re-read physical outer size after cross-display moves; preserve dimensions, focus, close/hide, renderer geometry and permissions. Add pure geometry cases without live OS input/window tests. No native compile/build or publication until authorized; source/API review is not installed multi-display acceptance.

## C130 matched Library preview footers (2026-11-13)

Local/FTP preview metadata footers share a fixed compact 56px height. FTP status/path/error stay on one row; truncate long text visually and retain full titles/accessibility text. Preserve Retry and all history/delete behavior. No build, real OS/server actions or commit/push before user acceptance.

## C129 icon update status and explicit one-click installation (2026-11-13)

Updates replaces visible up-to-date text with a green check on the check action; checking uses a spinner, with accessible state descriptions. Available versions show New version plus an inline install icon. Only an explicit user Apply action may chain official signed download, draft preparation, native busy/FTP guard, installation and restart. Background launch/daily checks never apply. Keep one controller lock across the entire chain, progress/errors and retryable busy/restart failures; never restart after failed download/install. Native action bridge accepts Apply only from existing main/preferences callers. Existing legacy separate actions remain compatible. No build, real updater installation/OS/server operations, signing changes or commit/push before user acceptance; native bridge compile and real signed-update validation remain pending.

## C128 compact Resize, utility actions and display placement (2026-11-13)

Resize follows the supplied compact reference: text-only segmented presets, proportional width/height and one Resize action; remove Crop Region and Cancel/close actions. Escape/outside click cancels. Specialized controls are 24px; allow this panel's text-only buttons explicitly in the source guard. Startup retry follows checkbox text; Check for Updates follows current version; Open Logs Folder is a bare icon after its row label. Library header reserves one fixed metadata line before/after decode and ellipsizes long names without moving preview geometry. Edit resolves the display under the pointer at document opening, centers within its work area using physical pixels/target scale and does not recenter on the hidden window's old display at presentation. Preserve all native permissions/credentials; no OS actions in tests. Native placement code and pure geometry cases await an authorized native compile/manual multi-display retest; no build or publication this pass.

## C127 compact Updates and control-first Settings checkboxes (2026-11-13)

Remove Test Notification from Settings and its renderer-only test/status subscription; preserve background native update notifications. Updates uses the existing product icon, Current version with an adjacent icon-only Check for Updates action, and actual current/new-version status below. Keep busy/error/progress feedback and explicit download/install/restart. Settings has no Done button/footer; move save/load errors into content and retain blur/unmount autosave flushing. Active Settings toggles use shared CheckboxField with checkbox-before-label DOM order and linked labels; retry actions stay outside labels. This supersedes earlier label-first switch and Done requirements only for active Settings. Preserve IPC/native gating and other app controls. No backend changes, build, real OS/server/credential actions or commit/push before user acceptance.

## C126 Settings divider headings and inline icons (2026-11-13)

Settings groups use left-aligned headings followed by a thin divider line; remove standalone duplicate separators. Hide routine save/clear notices and remove static explanatory messages; preserve actionable failures and essential updater/notification progress, version and install feedback. Choose Folder/Reset are labelled icon-only controls beside the read-only folder field, preserving dialogs/reset callbacks. Unsupported-startup retry becomes an icon next to its switch; keep short tooltips and accessible disabled-state context. Retain centered 420px columns, compact typography, autosave, native gating and updater behavior. No backend changes, build, real OS/server/credential actions or commit/push before user acceptance.

## C125 full Edit workspace (2026-11-13)

Edit's image workspace fills all available space below chrome, removing outer/stage padding and the fixed 16:9 viewport frame. Retire its dedicated ResizeObserver/width state. Keep source aspect ratio, small-image 100% opening policy, Fit, pointer-centered zoom/pan, crop confirmation, floating properties and bounded Konva rendering. Crop fits the available viewport without obsolete inline-header allowances. Native outer-window sizing is unchanged. This supersedes earlier fixed-viewport requirements only. No build, real OS/server actions or commit/push before user acceptance.

## C123 flat Edit tools, crop rhythm and square color (2026-11-13)

Edit tool buttons, overflow/add-image tools and crop/resize actions have transparent borders/backgrounds at rest, including selected tools; accent ink communicates selection. Hover adds a fine border and elevated surface without changing geometry; disabled controls stay quiet. Shared Settings/Library buttons remain framed. Size popover groups presets, dimensions and actions with consistent 12px vertical/8px field gaps. Editable color inputs are full-bleed 32×32px squares without padding/rounding; preserve the separate circular pointer-color readout. Keep callbacks, crop/resize keyboard confirmation, palettes, canvas geometry and accessibility. No build, real OS/server actions or commit/push before user acceptance.

## C122 centered compact Settings content (2026-11-13)

Save destination and FTP publishing are always-visible sections, without details/summary toggles. All Settings tabs share Hotkeys' centered 420px maximum content width, right-aligned labels and minmax(0,1fr) 50% control columns. Use local 12px UI/labels and 11px supporting text in content/footer; retain header icon/label sizing, 32px controls, current palette and contained scrolling. Shorten descriptions and folder button text while preserving accessible names, callbacks and autosave. No backend changes, build, real OS/server/credential actions or commit/push before user acceptance.

## C120 immediate Settings persistence and navigation scale (2026-11-13)

Remove Settings Save buttons: General/Advanced, FTP/HTTP, export basename, scroll speed and log retention persist on edits through existing IPC. Coalesce typing for 300ms; serialize writes across sections because native preference commands share an operation guard. No writes on load. Keep newer inputs/passwords intact on stale acknowledgements; clear entered passwords only after their current snapshot succeeds. Invalid input cancels queued snapshots, remains editable and blocks Done; failures stay retryable. Done flushes all sections before closing; blur/unmount flush pending work. Keep native toggles/folder dialogs serialized and updater install/restart explicit. Settings navigation icons become 28.8px (double 14.4px), labels 80% of caption size; other window titles stay unchanged. No backend changes, build, real OS/server/credential actions or commit/push before user acceptance.

## C119 Local Blur presentation recovery (2026-11-13)

User reports Blur disappears in Edit after reopening Local history. Foreground recovery rebuilds offscreen Blur rasters from the decoded original, alongside visible canvas recovery. Invalidate sampled caches once per presentation/focus recovery, not every zoom/pan or bounded recovery paint. Keep editable geometry/strength, manipulation hiding/resampling, original pixels and draft/export semantics. Browser evidence covers actual blurred pixels after reopen and injected offscreen backing-store loss; it does not establish the installed WKWebView failure's cause. No backend changes, build, real OS/server actions or commit/push before user acceptance.

## C118 Library bulk history and action deduplication (2026-11-13)

FTP selection actions include Remove history for multiple selected jobs, using ftp_remove only; never delete remote files or Local originals for this operation. Preserve remote Delete's explicit confirmation and active-upload guards. Remove duplicated preview Copy URL/Delete from FTP/Remove history and Local Remove cached copy controls; selection toolbar owns those actions in both tabs. Keep unique Edit, Refresh and Retry upload actions. Preserve partial-failure selections so successful removals are not repeated. Use the macOS adapter and retain compact controls at the 800px Library minimum. No backend changes, build, real server actions or commit/push before user acceptance.

## C117 icon-only loading (2026-11-13)

Shared loading placeholders show a Lucide spinner without visible Loading/Preparing text. Retain role=status and visually hidden descriptive text for accessibility. Reuse LoadingState for window, Library collection/preview and edited-preview preparation. Preserve reduced-motion behavior and all operation/status logic. Keep the local candidate/manual acceptance gate; no build or publication.

## C116 active-window title icon (2026-11-13)

Show the white app glyph in shared title chrome only while that window is active. Inactive/uninitialized windows hide the glyph with visibility, retaining its layout box so text/version spacing stays stable. All three routes use the existing shared appearance hook. This does not affect the menu-bar app icon, native traffic lights or packaged icon. Keep the local candidate/manual acceptance gate; no build, commit/push or real OS actions.

## C115 macOS design skill (2026-11-13)

Apply the project-installed [macos-design skill](.agents/skills/macos-design/SKILL.md), pinned to ceorkm/macos-design-skill commit 8f528a2364f996cd42f02a10b1b27198a74ca2a3. Read [the project adapter](docs/design/MACOS.md) before its references; explicit user decisions override generic skill defaults. Preserve exact system font, fixed dark palette, framed rounded controls, compact Settings, immediate Hotkeys, 25% Library list, native title chrome and stable 16:9 Edit canvas. Do not restore Search, auto light mode, onboarding, fake optimistic success or upload banners. Use renderer materials only on chrome/sidebar/popovers, layered shadows, inactive-window feedback, accessible loading/empty states and reduced-motion/transparency fallbacks. Do not claim desktop-native vibrancy or new cross-app dragging from CSS/injected tests. Keep original skill files byte-pinned with provenance. 1.1.11 remains local; no native/backend changes, build, commit/push or real OS/server/credential actions in this pass.

## C114 immediate hotkey rows (2026-11-13)

Settings Hotkeys follows the supplied seven-row reference: right-aligned labels, compact shortcut capsules, native modifier glyphs, inline clear and no ordinary Install/Remove footer. A valid recorded chord or row clear immediately invokes the existing transactional configure_shortcuts path, preserving other assignments. Only commit UI values after native acknowledgement; serialize writes and retain confirmed values on failure. Validate duplicate/reserved chords, normalize physical Key/Digit codes under Shift/Option, cancel recording on Escape/Tab/focus loss and ignore repeat/composition. Preserve conditional explicit Reset Shortcuts recovery for faulted registries only. Recorder capsules are specialized 28px controls. Native registration/persistence and startup restoration protocols stay unchanged. Keep 1.1.11 local until user acceptance; no build, commit/push or real OS shortcut/capture/server/credential actions in automated checks.

## C113 compact Settings and framed actions (2026-11-13)

Follow the supplied Settings screenshot for compact navigation and thin group separators without restoring fieldset frames/legends. Settings header glyphs are 14.4px (40% smaller than 24px); row gaps are 6px and section gaps 12px (half of C112). Keep 32px control targets, shared typography and window sizing. Buttons require a fine border and actual background, superseding C112 borderless actions: primary uses blue/white; neutral gray, completion green, restart amber and destructive red use framed surfaces. Match Edit icon-button surfaces while preserving selected #0F1216. No feature/backend changes. Candidate 1.1.11 remains uncommitted until user acceptance; no build, commit/push or live OS/server/credential actions.

## C112 borderless groups and icon actions (2026-11-13)

Remove visible fieldset frames and legend nodes; preserve native disabled-fieldset behavior and accessible group names through aria-label. Borderless groups use 24px separation without card padding; content keeps its top inset. Shared Button and dialog actions use compact borderless Edit styling with a leading Lucide icon. Define icons explicitly at call sites through the icon prop or an existing leading glyph; never infer them from runtime text. Primary actions use accent, completion success, destructive red and restart warning colors; neutral actions stay white. Keep canvas handles, Library rows and numeric status cells specialized. Update UI standards and source guards. 1.1.11 remains a local candidate awaiting user acceptance; no build, commit/push or live OS/server/credential actions.

## C111 manual publication gate and form layout follow-up (2026-11-13)

User now requires personal acceptance BEFORE every commit and push; this supersedes previous automatic verification-release publication authorization. Keep 1.1.11 as an uncommitted candidate until explicitly accepted. Use SwitchField for settings switches: label first, switch last in both DOM and visual order; never use row-reverse to repair inconsistent markup. Settings owns one consolidated layout stylesheet with shared token spacing, top insets, consistent field rows and rounded controls/panels. Preserve specialized canvas geometry and existing settings callbacks/IPC. Test with injected browser/native fakes only. No native build, real OS/server/credential actions, commit or push for this follow-up.

## C110 unified interface system (2026-11-12)

Use shared `components/ui` primitives for all controls; native button/input/select/textarea/progress tags belong only inside that library. Keep semantic HTML layout and existing native form/ref/event/IPC behavior. Interface typography uses exactly `system-ui, -apple-system, BlinkMacSystemFont, sans-serif`; annotation/export fonts remain independent. Configure font/weight/spacing/control dimensions/radii in `src/styles/tokens.css`, apply them through `src/styles/design-system.css` and follow `docs/design/INTERFACE.md`. Form controls are 32px high with 12px rounding; panels use 20px rounding. Keep circular/pill controls, canvas handles and fixed editor status geometry appropriate to their function. Preserve white/silver, #232427, #257EFE and #0F1216 with a fine selected border. No dependency upgrades or native/credential/server actions. Patch 1.1.11; existing features stay 100% USER_REPORTED, new visual changes and native update notices require user verification.

## C109 native notification delivery, cursor zoom and arrows (2026-11-12)

User confirms installed 1.1.8 detects available 1.1.9 but shows no system notification. Legacy pinned notification backend returns before actual macOS submission and reports permission Granted unconditionally; its runtime failure cause remains unproven. Use modern UserNotifications on macOS through the already-locked objc2-user-notifications 0.3.2, with real authorization/submission callbacks, bounded waits off the UI thread, retained delegate and foreground Banner/List presentation. Only matching default update/test clicks open Updates. Keep the Tauri plugin for existing capture/non-macOS paths; no dependency upgrades or Swift. Add user-triggered Test Notification and enum-only status/error logs; no fake update or automatic install/restart. Preserve normal launch/daily checks and successful-version deduplication. Wheel/pinch zoom anchors document coordinates under the pointer, keeps frame batching and pan, and Fit/new documents reset camera offsets. Arrow shafts end at bounded filled head bases, without tip-protruding caps or duplicate outline strokes, consistently in preview/export. Patch 1.1.10. Existing features stay 100% USER_REPORTED accepted; these fixes/native notification delivery require retest. No live OS notification/capture/input, credential, server or permission actions in automated checks.

## C108 performance cleanup and functional acceptance (2026-11-12)

User explicitly accepts existing features as 100% USER_REPORTED functional acceptance; this supersedes the old 85% functional checkpoint. Native update notification remains a separate pending version-to-version manual check, not 100% evidence. Optimize measured work: lazy-load window routes, reset visible backing canvases once per presentation while retaining bounded recovery paints, remove unused Edit history polling/sidebar DTOs, coalesce queued draft saves and skip unchanged snapshots, reuse original PNG for empty Local drafts, memoize Library rows/dates. Retire only reference-verified isolated legacy Library UI/tests after a byte-verified ignored archive; preserve author history, immutable reviews/research, credentials and user data. Keep save/retry/draft/output semantics and 30-day cache expiry. Patch 1.1.9; commit/push under existing release authorization. No real capture/notification/server, credential, Keychain or permission actions in automation.

## C107 native update notices and capture repaint (2026-11-12)

User reports latest checklist 2/3/5–8 PASS, requests native macOS update notifications instead of the in-app banner, and reports repeated captures occasionally blank until zoom. Native updater notifications use the existing pinned Tauri plugin, deduplicate successful submissions by version per process, keep failed submissions retryable, and open Updates on the notification tap. Notification delivery/listener errors must not prevent startup, check/download/install or restart; preserve launch/daily checks and explicit installation. Remove the obsolete renderer banner. Re-measure the visible canvas on presentation/focus/visibility, recreate visible backing surfaces and repaint synchronously plus bounded callbacks through 400ms; cancel them on capture/unmount and preserve mask/cancel/drafts/zoom/export. Patch 1.1.8; native notification delivery and repeated-capture repaint remain manual retests at 85%. No live notification, OS capture/input, server, credentials or permission actions in automated checks.

## C106 local passwords and capture polish (2026-11-12)

User reports checklist 2–4 PASS, Screen permission continuity working, Keychain reauthorization remaining, and faint old Edit pixels in item 5; item 6 waits for the next release. User authorizes replacing runtime Keychain use with native-only plaintext local credentials (0600 atomic bounded private file); never return stored secrets to renderer/logs/arguments. Preserve existing Keychain entries without accessing/migrating them; user re-enters FTP/HTTP passwords once. Remove automatic legacy Keychain import. User transferred stopped C106/root-wiring claims to this session. Clear/mask retained canvas pixels before native capture hides Edit and restore on cancellation/presentation; keep drafts/output unchanged. Fastest settling delay becomes 100ms, Fast 250ms; preserve overlap/bounds. Add tool/drag/resize/disabled/loading cursors without changing gestures. Ship patch 1.1.7, keep 85% until transition/credential/update retests pass. No real capture/server/Keychain/permission actions in automation.

## C105 acceptance follow-up (2026-11-12)

Record USER_REPORTED passes 1 and 3–5; item 2 remains pending the next same-certificate update. Annotation stroke widths remain document-pixel values and scale visually with zoom. Native menu accelerators supersede C104 display-only suffixes; deduplicate native/global dispatch without replacing saved shortcut registration. Capture-only textured registration tolerates antialias/minimap differences while strict generic stitching remains unchanged. Persist five bounded scroll speeds, refresh the focused baseline and expose partial capture status; partial output opens Edit and never silently auto-uploads. Repaint after native Edit presentation. Check updates once immediately per launch, preserving daily checks, shared busy control and explicit install/restart; show a versioned available-update banner. Patch 1.1.6; acceptance stays 85% until real VS Code scrolling, repaint, tray and signed-to-signed permission tests pass. No local private identities, Keychain changes, OS input/capture or real server actions in automation.

## C104 release and editor performance repair (2026-11-12)

User authorizes trimming release work. Cache Cargo dependencies/outputs, run certificate preflight before toolchain setup, remove duplicate standalone typecheck/debug-native compilation from CI; retain fast regression checks, TypeScript in production build, universal release compilation with warnings denied and all app/updater certificate/signature verification gates. Certificate extraction uses --extract-certificates=PREFIX; reproduce only with read-only public system signatures, never local private identities. Touchpad sequences remain pan at boundaries; modified wheel zoom is frame-batched and applies across image workspace margins. Bound Konva canvases to the visible viewport while keeping full document coordinates/drafts/exports. Show installed global shortcuts as display-only tray suffixes to avoid duplicate accelerator registration. Retry line-based wheel input only when the initial pixel input causes no movement; pointer interruption ends capture with retained pixels. VS Code editor is a user-reported failing app; real app-specific/native validation remains pending. Preserve unrelated evidence/native-summary.json, updater keys, temporary-only CI keychains, no notarization and 85% acceptance. Patch 1.1.5 carries these changes.

## C103 Escape finalizes captured scrolling pixels (2026-11-12)

User reports Screen now passes and Scroll moves, but Escape shows an error rather than pixels. Sanitized installed 1.1.3 diagnostics show stitch_frames failure after six frames. Escape must retain the longest aligned prefix (or the first valid frame) rather than fail the entire capture on an unalignable tail. Interrupted in-flight capture errors are ignored only after an explicit stop; ordinary capture/registration failures remain errors. Do not invent overlap or claim every partial frame was retained. Preserve existing pixel/frame limits, ownership, bounded input and diagnostics. Patch 1.1.4 is for this functional change; C102 workflow/version-management logic remains unchanged. Screen PASS is USER_REPORTED; scroll-stop and persistent signing/permission continuity await real verification. Keep 85% acceptance and no live OS/server actions in automation.

## C102 passwordless certificate release signing (2026-11-12)

User configured self-signed FerShot X identity in release environment APPLE_CERTIFICATE and MACOS_SIGNING_IDENTITY, with a blank PKCS#12 password. Release CI requires the identity/certificate and maps the variable to APPLE_SIGNING_IDENTITY; do not fall back to ad-hoc. Import/authorize only a new temporary runner keychain, validate matching certificate/private key and probe signing before the build. Verify strict signatures and exact certificate fingerprint in both architectures of the final app and downloaded updater archive before publication. Cleanup the owned keychain and restore the runner search list. No local Keychain, existing entries, trust stores or OS privacy settings may be changed. CI-only secret consumption is authorized; never read local private keys, generate a certificate or expose secret values. Keep updater keys, no-notarization policy, release detection and version management unchanged for this workflow task. Certificate continuity still requires real signed releases/manual acceptance.

## C101 native feedback and optional stable identity (2026-11-12)

Record USER_REPORTED passes 2 and 4–15; Screen display, automatic scrolling and post-update permissions remain open. The user's Keychain popup is OS access reauthorization, not a lost FTP password. Full Screen freezes the display under the pointer before hiding views; never silently fall back to primary, preserve global negative coordinates and validate display identity. Automatic scroll uses bounded pixel input through HID hit testing at the selected region, validates its target and restores the pointer only when not moved by the user. No automated real OS input/capture. Add optional explicitly configured persistent app-signing identity/certificate via user-managed GitHub secrets; never generate/read private keys or weaken Keychain ACL/TCC. This extends the previous ad-hoc-only policy; default stays ad-hoc without configured identity. Preserve real updater-key continuity. Certificate migration requires one-time manual trust/permissions and a later signed-to-signed update test; it is not declared fixed by source checks. Acceptance remains 85% pending the three retests. Ship patch 1.1.3 under normal publication authorization.

## C100 retired-source cleanup (2026-11-12)

User requests fixing native warnings and deleting obsolete generated code. Remove retired Print/Pin native backends, unused IPC/window wrappers and capabilities, and orphaned inline UI wrappers only after reference checks and a byte-verified ignored archive. Preserve immutable reviews/research, author history, releases, credentials and user data. Replace the deprecated ignoringOtherApps activation flag with normal supported activation options; do not suppress warnings or upgrade dependencies. Verify production native code with cargo rustc --lib -- -D warnings, functional tests and TypeScript. Ship patch 1.1.2 under existing normal commit/push authorization. Real macOS focus/capture/updater acceptance stays 85% pending manual verification.

## C99 manual feedback corrections (2026-11-12)

Version 1.1.1 addresses the user's five reported issues. Treat positive Accessibility trust as sufficient scroll-event permission despite a false CoreGraphics preflight; do not bypass denial when both checks fail. Actual ad-hoc OS permission/scroll behavior remains manual. Restore saved global shortcuts on startup, and install/remove active and saved assignments atomically with rollback on persistence failure. Settings exposes a separate Updates tab; tray opens that tab and requests a check, preserving explicit install/restart. Use semantic status colors with text and automatically preview the first Library row without overriding manual selection on refresh. Preserve 85% acceptance, key continuity, injected OS/server tests, and user-authorized versioned verification publication.

## C98 user-authorized main publication for verification (2026-11-12)

User explicitly requests committing/pushing the accumulated updates before installing/verifying the remaining 85–100% and authorizes automatic versioned releases when package.json increases on main. This supersedes the earlier no-publication-before-acceptance restriction for these verification releases; it does not mark native/server/updater acceptance complete. Commit only reviewed completed sources/docs and immutable packets, excluding private keys, credentials, captures, generated overlays and build artifacts. Push normally to origin/main; never force. Main pushes compare stable MAJOR.MINOR.PATCH with the push's prior commit; ordinary unchanged/decreased versions skip. Release-pipeline repairs may retry the same unpublished version; the remote immutable-release guard still applies. The release action creates version tags automatically. Manual workflow dispatch supports retry on main; published versions are immutable, old versions cannot replace latest, and existing draft tags must match the source commit. Preserve ad-hoc app signing, pinned public key and mandatory updater signatures. GitHub secrets remain user-managed; never read the private key/password. Report actual push/CI results separately from 85% manual acceptance.

## C97 ad-hoc updater distribution (2026-11-12)

User explicitly declines Developer ID Application and confirms the public repository and existing ~/.tauri keypair. Supersede C96 Apple signing/notarization requirements: app signing uses signingIdentity "-"; updater archives still require real Tauri signatures. Only the public .pub key may be read/embedded; never print/read/copy the private key or password. The validated public key is pinned in base Tauri config, enabling the manually installed bootstrap to accept future signed releases. Local bootstrap packaging needs no private key; CI's generated overlay enables signed updater artifacts. GitHub requires only TAURI_SIGNING_PRIVATE_KEY and its password when encrypted; no Apple secrets. Preserve public-key continuity and reject mismatched overrides. Build/package the configured 1.1.0 candidate without live capture/server/update installation or publication. Ad-hoc Gatekeeper/capture permissions and real version-to-version update remain manual acceptance; 85% stays unchanged. Preserve historical C96 reports and the previous unconfigured artifact.

## C96 official updater bootstrap (2026-11-12)

User authorizes updater/process dependencies, product 1.1.0 and native test/build/packaging for this request, superseding the earlier no-build restriction for C96. Use official Tauri 2 updater/process plugins; only main owns plugin resources and restart permission. Settings/tray share one controller with persisted 24-hour automatic checks, explicit download/install/restart, bounded state/progress and enum-only error logs. Flush Local drafts before install/restart and block installation during native image operations or FTP transfer/deletion. Startup uses monitor-cog with a trailing enabled tick; Check for Updates uses cloud-sync. GitHub Actions signs/notarizes universal Mac artifacts and generates latest.json on matching accepted version tags. Never generate fake signing keys, commit secrets, embed repository tokens, or claim real signed-update acceptance from injected tests. Blank base pubkey deliberately disables the local candidate; scripts/configure_updater.py requires a real public key and enables signed artifacts via an ignored release overlay. Follow docs/releases/UPDATES.md for actual GitHub/Apple/signing configuration and one-time configured bootstrap installation. Preserve C95 work/authorship; no release push/publication before evidence-backed acceptance. Acceptance stays 85%.

## C95 capture presentation and scrolling recovery (2026-11-12)

Keep the other client's image-appropriate Edit sizing and 80% Library sizing; C93 fixed 80%-Edit geometry is superseded. Successful captures and Library Edit handoffs never reveal Edit before the renderer commits the matching image, sizes the window and synchronously draws Konva. Repaint retained canvas pixels on focus/visibility restoration; do not rely on animation frames while hidden. Cancel/failure restores previous native views. Preserve mouse-wheel zoom, trackpad pan and pinch; gesture classification expires by elapsed time across rerenders. Desktop scrolling uses bounded capture-specific registration with small pixel tolerance, narrow scrollbar exclusion and shared fixed header/footer retention; the strict generic stitcher stays unchanged. Reject unrelated frames or absent movement; native behavior remains unverified until an authorized build and manual retest. Keep cloud-upload immediate-capture mode and its failure recovery. Acceptance stays 85%; no build, real capture, server action or release publication this pass.

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
