# Screen recording acceptance

Candidate only; do not mark native capture/audio accepted from injected tests. macOS 15+ is required for direct MP4 recording. No app build/publication is included in this implementation pass.

1. **Record Screen:** put the pointer on each display, start from tray, move the pointer/click, stop from tray. Edit must open with the intended full screen, correct dimensions and playable video.
2. **Record Area:** select a small region on each display, including Retina/negative-origin monitors. Only that region is recorded; cursor/click effects stay aligned. A cross-display region is rejected. Escape cancels selection and restores the previous view.
3. **Stop/recovery:** stop after a short and a longer recording. Try display disconnect/permission failure. No indefinite busy state; an error preserves the original file where available. Quit during recording finalizes the file before exiting.
4. **Audio:** separately test both toggles off, system audio only, microphone only and both on. Deny microphone once; app should report the failure and restore the previous view. Existing screenshot permissions must be unchanged.
5. **Video Edit:** play/pause/seek, trim head/tail, add/move/resize timed highlights, edit color/opacity/timing, toggle mute/cursor/click highlight, change cursor size, Undo/Redo. Hide Edit and confirm audio stops.
6. **Local history:** close and reopen the video; original, trim, highlights and pointer effects persist. Local preview reflects saved edits. Single-click selects; double-click/Edit opens with loading feedback. Delete removes only the cached recording.
7. **Save/Copy:** save edited MP4, cancel Save, choose an existing name (must not overwrite), paste copied video file elsewhere. Verify actual duration, audio, highlights and cursor effects in an external player.
8. **FTP:** upload video, check copied predicted .mp4 URL, month/naming modes, transfer completion, failure/retry keeps URL, preview with HTTP authentication, reopen remote video, copy links, remove history, explicitly confirm remote deletion. Completed FTP history retains thumbnail; the Local original is removed only after successful upload.
9. **Regressions:** Screen/Area/Scroll images, image annotations/blur/magnifier, Local draft reopen, image Copy/Save/Upload, FTP preview/cache/delete, global shortcuts, Settings isolation and update-notification routing.

Report app version, step, expected/actual behavior and sanitized error log. Never send credentials or private recordings.

## Recording delivery follow-up (C161)

- Record Screen for 5–10 seconds and stop from the tray: Edit appears once the MP4 is finalized, with video playback rather than a blank hidden window. Compare short and longer clips; report any long wait.
- Record Area: only the surroundings of the selected region on that display dim slightly. Other apps remain clickable. The guide disappears on stop/error and is absent from the recorded pixels. Repeat on a secondary display with different scaling.
- Enable Upload Captures Immediately, record and stop: upload starts without showing Edit. Check the FTP row, URL, playback and thumbnail. Disable the toggle: the next recording opens Edit normally.
- With FTP misconfigured, immediate upload must retain the recording and open Edit with a retryable error. Correct the configuration and retry without creating a duplicate queued job.
- Confirm image Screen/Area capture, Save, Copy and FTP behavior are unchanged. These installed checks are pending; automated cases use generated media/injected IPC only.

## C162 stop-failure retest

1. Turn immediate upload off. Record Screen for 5–10 seconds, then Stop Recording: Edit must show this video; play and seek to verify it. Repeat three times and repeat with Record Area.
2. Reopen Library → Local: prior complete recordings missing metadata should appear as Recovered recording.mp4 after background refresh. Double-click to open Edit. Incomplete files remain excluded and originals are retained.
3. Enable immediate upload, record and stop: FTP receives the MP4 without Library appearing as a successful completion route.
4. If stopping fails, Library must show the recording error, keep it through Refresh and select Local. Report the new stop_recording stage and duration from logs.

Pending installed acceptance; no bundle/publication or real recording/server actions performed by automated checks.

## C163 layered timeline acceptance

1. Open a recording with mouse metadata. Verify separate Video/Audio/Cursor/Clicks rows; draw a highlight to create its row. Toggle each eye and compare playback with an exported MP4.
2. Select a clip, move the playhead and Split (⌘B). Drag a clip and both trim edges. Confirm the content/mouse correspond to the retained source interval; gaps show black/silence or no overlay.
3. Duplicate a video or cursor clip (⌘D), play across the join and export it. Confirm duration and source content. Duplicate/delete mouse layers, then undo/redo and reopen from Local.
4. Lock a layer: clip move/trim/delete/duplicate and canvas highlight movement must be unavailable. Unlock and retry. Hide a layer without losing its clips.
5. Ripple-delete a video segment: video, audio, mouse, clicks and highlights close the same interval. Locked layers prevent this operation. Ordinary Delete leaves a gap.
6. Select macOS Arrow and Custom Arrow, compare Edit, Local preview and saved/uploaded MP4. Check the tip stays aligned. A no-metadata recording must not offer editable cursor layers.
7. Confirm image capture/edit/output and immediate video upload remain unchanged. Real audio/capture/server operations are user-driven; automated checks use generated media/fake IPC only.

## C164 controls follow-up

- Settings → Hotkeys: record and clear Record Screen/Area assignments; restart and verify they restore, appear in tray and trigger the correct mode. Repeating the hotkey stops an active recording without duplicate dispatch.
- Tray: confirm monitor-play for Record Screen and monitor-stop for Record Area, matching existing icon size/color.
- Disable both recording audio inputs, record and stop: there is no Audio row or mute action. Enable one input and verify audio playback/export in its row.
- Select Cursor → macOS Arrow: artwork should load, persist and export without the former error. Custom Arrow remains selectable. Mouse footer controls and add-layer controls are absent.
- Delete a metadata layer or its last clip: its row disappears, remaining labels/bars align, undo restores it. Tracks are shorter and video preview has more space.
- Drag each dark trim boundary and export: start/end and effect timing match. Arrow keys adjust focused handles; Shift adjusts one second. Cancel a drag and undo/redo without corrupting clips.

Installed acceptance remains pending; no live capture/audio/global shortcut/server operations are performed by automated checks.

## C166 snap and tool acceptance

- Select Cursor using the new gutter Select Layer icon: inspector opens without toggling eye/lock. Repeat with locked and empty tracks.
- Drag either trim handle near a clip start/end or playhead: it holds briefly by distance and shows a labelled blue guide. Pull farther to release; Option allows fine movement without snapping. Cancel/undo preserves the original range.
- Image Edit: move rectangle/text/counter/inserted image near another element's edge/center or canvas center. Check target outline, guide and relation label; zoom and Option bypass. Release clears feedback; Save/Copy must not include guides. Retest magnifier source/lens movement.
- Video: add Text (Enter commit, Shift+Enter newline, Escape cancel), Arrow and solid Cover. Move/resize, cut timing, hide/lock, duplicate/delete and reopen the Local draft. Export/upload and compare visible text, arrow direction and opaque cover with preview. Cover does not track moving content automatically.

No build/publication or real capture/server acceptance is claimed by automated checks.

## C169 windows and image layers

- Move Library, close/reopen: it centers on the pointer's display at 75% of usable width/height; repeat across Retina and external displays. Double-click its titlebar to maximize/restore.
- Open small/large images: Image Edit retains image-dependent sizing. Open video: Edit centers at 80% width/height. Settings always opens centered at its fixed size and cannot resize/maximize.
- Open a layered video: bottommost Video layer is initially visible; scroll upward to the remaining layers.
- Add Image → Open File or Capture Screen/Area/Window: the video remains open and a separate Image layer appears. Move/resize, change opacity/timing, hide/lock, duplicate/delete, undo and reopen Local. Verify Save/FTP output contains the image at the correct position and time. Cancel import/capture without replacing the video.

## C171 dedicated Stop recording hotkey (supersedes C170)

- Settings → Hotkeys → Stop recording: assign a combination, verify immediate persistence, clear/reassign, restart and verify restoration. Existing screenshot/Screen/Area assignments remain intact.
- Start Screen/Area recording, then press Stop recording with the app hidden: it finalizes and follows Edit/immediate-upload settings. Press while idle: no recording starts and no window opens.
- App logo keeps its ordinary icon and left-click menu while recording. Use either the stop shortcut, menu Stop Recording or the native macOS recording control.

## C177 Record Area guide placement/output

- Select Record Area near the top/menu bar and in the middle: dimming stays entirely outside the selection. Repeat on a Retina display and a secondary display above/left of the main display.
- Record a test pattern extending across the selection boundary, stop, then compare Edit and saved MP4: the selected top edge is unchanged and no dim bands appear in the video.
- Repeat with all app windows hidden before starting. Fullscreen and full-display area selections must remain valid. Cancel, stop and startup failures remove every guide. No real capture is run by automated checks.

## C180 capture exclusion

- While starting, recording and finalizing, try all screenshot and Record Screen/Area shortcuts/menu entries. They must neither capture nor stop/restart the current recording.
- Stop using the dedicated Stop Recording shortcut/menu or native macOS control. Verify delivery to Edit/FTP, then start another recording.
- Cancel area selection; verify recording and screenshots can be started again. After a failure, verify retry is possible and report operation/stage/duration from errors.log.
