# Video implementation

This is an unpublished candidate on the current product version. Do not infer real capture/audio or server acceptance from synthetic tests.

- ScreenCaptureKit is loaded on demand through libloading 0.7.4 and the existing objc2 0.6.5 runtime, avoiding a hard framework dependency for older macOS launches. Direct MP4 recording is gated on SCRecordingOutput availability (macOS 15+). Fullscreen freezes the pointer display; native area selection freezes a single-display region, converts to display-local points and maps metadata to normalized source coordinates.
- AVFoundation 0.3.2 Rust bindings and Core Animation/QuartzCore 0.3.2 export H.264 MP4 using the native media pipeline. Every original remains immutable while an edited output is prepared. Core Animation bakes timed highlights and cursor/click metadata into output. There is no Swift helper, FFmpeg download or bundled encoder binary. See [objc2 framework crates](https://github.com/madsmtm/objc2) and [Apple SCRecordingOutput](https://developer.apple.com/documentation/screencapturekit/screcordingoutput).
- Capture runs in one worker owning the native objects and NativeJobs guard. Audio permissions are requested only from explicit Start with the microphone toggle enabled. Raw mouse positions/button states are sampled at about 30 Hz only within recording; keyboard text is never collected. Source geometry and display identity are revalidated; Stop/limits/Quit finalize the file. Errors restore the previous view.
- Session settings default audio off and metadata on. Maximum recording duration is 30 minutes, 1080p/30fps and approximately 1 GiB. Local recording history expires after 30 days, caps at 200 clips and a 5 GiB original-file budget. Metadata is stored separately from the small frequently saved draft.
- React Konva owns highlight gestures/resize; native hardware video playback and shared form controls handle timeline/audio/effects. Rendering readiness checks both loadedmetadata and existing readyState to handle cached media/Suspense. Video actions intercept their own shortcuts, preventing stale image output.
- Library interleaves videos and images. Local previews replay the draft’s timing/effects; remote previews display baked output. FTP uses the existing frozen destination, timestamp reservation, transport, HTTP credential handling and deletion confirmation. MP4 bytes remain native and never cross IPC as base64. Native authenticated previews stream into a private cache, with at most two downloads, two completed files (up to 1 GiB each) and a five-minute reuse TTL. Explicit Refresh bypasses reuse; selection changes supersede earlier FTP video reads. Successful transfers remove retry video/Local originals and keep thumbnail/history. Remote re-edit starts from the published flattened video; pointer metadata and editable layers are local only.
- Existing updater/install guards share NativeJobs, so an active recording/export blocks installation. No signing/updater configuration or certificate changes are made.

Synthetic tests create colored canvas/AVAssetWriter frames only. The native export test checks duration, real highlight pixels, poster decode and immutable originals. Manual capture, audio synchronization, permissions, native region selection and actual FTP require the [acceptance checklist](../releases/video-manual-acceptance.md).

## C161 stop-to-presentation path

The recording worker explicitly removes its recording output, stops its stream and inspects the finalized MP4 before writing metadata. The delegate finish event is used when available; after a missing-event grace period, asset validation still gates publication. Zero/reset post-stop `recordedDuration` is no longer a presentation gate. Thumbnail generation is background work after queue delivery and rereads the latest draft under the document mutex. A sized editor presents independently of media decoding, with bounded playback failure/retry feedback. This is a source correction, not a measured installed latency claim.

Record Area uses four native borderless click-through AppKit windows, 24% black, outside the selected rectangle. Main-thread ownership and RAII cleanup cover success/cancel/failure. The recording excludes this app and clips to the selected rectangle. No overlay creates a renderer or intercepts user input.

Immediate upload preference is frozen at start and carried only on capture-generated inbox entries. Ordinary Library reopening never auto-uploads. Failed preparation/start opens the editable original and retains an already queued job for retry. An unchanged video without visible metadata overlays returns its original MP4; trim, mute or visible effects still require export. No live capture or server calls run in automated checks.

## C162 correction to recording finalization

Installed C161 logs reported `finish_recording` failures after 0–3 ms before saving document metadata. The prior explicit output-detachment path is superseded: call stopCapture with the recording output still attached, following Apple's stream-stop path. Keep terminal delegate state even when the recording loop consumes its event. Only ScreenCaptureKit's -3808/-3817 stop acknowledgements are benign; unrelated domains and writer failures remain failures. Require complete MP4 atoms plus readable asset metadata before delivery. Synthetic Objective-C streams exercise callbacks without accessing capture devices.

Local history recovers older complete original MP4s missing document.json on a background pass. It holds native job/document guards, skips active/incomplete/symlink paths, caps directory scans and restores at most four clips per pass. It never changes existing drafts or auto-uploads recovered media; missing pointer effects cannot be reconstructed. Library retains recording errors across refresh/reopen and selects Local on failure. Generic application Reopen is suppressed while recording is active. No installed success is inferred from these automated checks.

Source reference: [Apple ScreenCaptureKit recording lifecycle](https://developer.apple.com/videos/play/wwdc2024/10088/?time=521). Historical C161 packets remain unchanged.

## C163 layered timeline

Video Edit lazily imports pinned [React Timeline Editor 1.0.0](https://github.com/xzdarcy/react-timeline-editor), MIT, compatible with React >=18. It supplies ruler/playhead, virtualized rows and clip dragging/resizing. The package and transitive dependencies are locked; no existing dependency is upgraded. Product controls use existing UI primitives/tokens. Legacy draft schemaVersion 1 remains readable through optional timeline/cursor fields.

Each layer has enabled/locked state and nonoverlapping clips with project start/end and sourceStartMs. Limit: 32 layers, 64 clips per layer, 256 clips total, original 30-minute/byte limits. Video/audio are base tracks; cursor/click/highlight/text/arrow/cover/image tracks can be duplicated/removed, mouse tracks restored only through existing draft history. Split retains source offsets; left trims advance source offsets; duplication searches the next free interval. Ordinary deletion leaves a gap. Video Ripple Delete closes the interval across all layers and refuses locked projects. Undo/autosave retain whole draft snapshots.

A project clock drives independent HTML video/audio spans, including gaps and duplicated source ranges. Native AVMutableComposition inserts the same source spans at project times and exports through the existing signed-app/native MP4 path. Metadata is remapped before Core Animation effects; invisible boundaries prevent cursor leakage through gaps, and click transitions are detected in source time before cutting. Actual generated-media checks verify retimed frame colors, extended duration, baked cursor artwork and unchanged originals. Timeline widgets do not perform export.

macOS Arrow reads only public NSCursor.arrowCursor artwork/hotspot on the main thread after user selection, bounded/validated as PNG and stored with the draft. Custom Arrow uses color/size. No screenshot, device, permission or global cursor-shape inspection occurs. This is a fixed macOS arrow style, not capture of changing I-beam/resize cursors. A recording without mouse metadata cannot gain an independently editable cursor; existing baked cursor pixels remain in the video.

Installed capture stop, real audio playback/synchronization and final FTP/update acceptance are still manual. No bundle/version/publication is authorized by this source implementation.

## C164 compact recording workflow

Recording shortcuts use the existing immediate Hotkeys configuration and transactional native registry. Old five/eight-key maps migrate with empty recording assignments; saved configurations retain other actions. Menu/global accelerators share duplicate suppression, including stop-on-second-trigger. Tray PNGs are generated from installed Lucide monitor-play/monitor-stop, white 18×18 like existing entries.

Clip metadata optionally stores hasAudio. New captures freeze enabled audio inputs; older files are inspected on the background document read and derived metadata is saved without overwriting newer drafts. Remote/recovered MP4s inspect their actual audio tracks. Silent media omits Audio in migrated timeline, preview and export; timeline validation permits zero/one audio layer. Public cursor NSImage artwork is rasterized through CGImage at a bounded resolution, avoiding TIFF representation conversion; synthetic NSImage pixels test dimensions/hotspot/PNG validity.

Timeline rows are 28px. Structural keys remount the virtualized editor on layer removal/addition so deleted rows vanish; scroll/playhead restore afterward. Removing the final metadata clip removes its row; the video base remains. Trim start/end use dark masks across tracks with pointer-captured handles, keyboard arrows (100ms, Shift 1s), cancellation and one undo transaction per drag. The old start/end sliders, mouse footer switches/color/size and add-layer controls are removed. Cursor style stays in a contextual inspector when its layer is selected. Existing master cursor flags migrate to layer enabled state.

Automated validation does not establish installed macOS cursor/shortcut/capture acceptance. No bundle/version/publication in this candidate.

## C165 icon geometry and timeline controls

Recording icon PNGs retain the existing monitor.png outer artwork byte-equivalent in alpha outside the interior display region. Only the Lucide Play/Stop interiors are composited, at 14px SVG size/2.4 source stroke centered in the 18px canvas. Matching canvas dimensions alone previously left the new glyphs larger/thinner. A pixel comparison confirms zero outer-frame alpha differences.

Timeline layer names remain inside clips, with an icon-only 60px left gutter. Hide/show and lock actions have accessible group/action names plus standard tool hints, 22px targets and 11px glyphs. Action/transport buttons share `ui-editor-icon-button` with Edit-style transparent rest, framed hover and consistent semantic states/strokes. No clip, trim, draft, native behavior or publication change in this pass.

## C166 magnetic alignment, selection and annotations

Trim handles use a distance latch (7 CSS pixels capture, 13 release) around clip boundaries, project edges and playhead. A labelled vertical guide shows the exact snapped time. Option bypasses capture/holding; release/cancel clears the guide. No timed wait, OS haptic or document mutation is used for feedback. Existing library snapping for clips stays unchanged. The gutter now has a separate Select Layer icon plus Hide and Lock, preserving icon-only labels while allowing locked or empty layers to be selected independently.

Video annotation kinds now include Text, Arrow and Cover, sharing backward-compatible cue storage and independent timeline kinds. Text starts in a focused shared Textarea: Enter/blur commits, Shift+Enter inserts a newline and Escape cancels. Existing text opens from double-click or Edit Text. Arrow stores normalized endpoints through rectangle geometry/reversal flags; Cover is an opaque fill with no opacity control. Color, timing, geometry, layer operations, drafts/undo and Library preview persist through the existing pipeline. Core Animation exports actual text/arrow/cover layers; CATextLayer is explicitly displayed before asynchronous export. Generated MP4 pixel assertions cover white text, red arrow and black masking rather than only metadata.

Image dragging reuses the pure snap latch with zoom-correct thresholds, cached edge/center candidates and rotated axis-aligned bounds. Canvas snaps use matching anchors only. Dashed target outlines, alignment lines and labelled badges live on the existing nonexported overlay layer and clear on cancel/blur/end. Detached magnifier lens movement uses the same drag alignment. These are visual magnetic guides, not native physical haptics. Installed behavior remains pending user acceptance.

## C167 toolbar grouping and bounded layer viewport

Use integer toolbar orders for video annotations: Copy/Save/Upload (0–2), Select/Highlight/Arrow/Text/Cover (10–14), history actions (20–22). CSS `order` rejects fractional values, which previously put Arrow/Text/Cover at the default zero position. Layer rows remain 28px; their viewport caps at 98px (3.5 rows), keeping the 42px ruler separate. The gutter scrolls natively and synchronizes with the virtualized editor; editor scrolling updates the gutter. Half a row signals more content. Existing selection, clip gestures, trim overlays and playhead are unchanged.

## C168 integer native timestamps

Installed diagnostics identify `recording_save_draft` IPC failures but omit the raw deserialization reason by design. Source inspection reproduces one cause: requestAnimationFrame/project seeking yields fractional millisecond positions and annotation creation previously copied those into Rust u64 timestamp fields. Cue creation now rounds committed times, and Save Draft/Save/Copy/FTP boundaries canonicalize all draft timestamps without mutating input. Nonfinite/out-of-budget timestamps remain errors; preview timing/geometry is unchanged. Safe invalid-args errors use invalid_input diagnostics without logging raw payload/error strings. Browser regression plays/pauses before drawing and rejects fractional timestamps at injected native boundaries; native serde coverage confirms integer Arrow roundtrip/fraction rejection. Installed acceptance remains pending.
