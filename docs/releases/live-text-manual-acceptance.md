# Native Live Text manual acceptance

Run on the next authorized installed build. Automated tests use generated pixels and injected statuses; they do not perform real recognition, UI selection or clipboard operations.

1. Library → Local: select an image with clear text and enable **Live Text**. Select words/lines directly, use ⌘C or the native context menu, and verify the pasted text. Repeat on an authenticated FTP preview after it has loaded. No extra network read should be needed for analysis.
2. Wheel/Command-wheel and pinch zoom at the pointer; two-finger swipe pans. Check text-selection highlights track pixels at every scale. Focus the native image and test +/−/0. Toggle off: normal image preview camera and Library Copy/Delete work again.
3. Switch images/tabs during analysis, then toggle off/retry/Refresh. No old text/image overlay may attach to the next item. Hide/reopen Library and resize/move it across displays: the native view stays clipped inside the preview, away from header/footer controls.
4. Open FTP Delete confirmation while Live Text is enabled: the native image disappears behind the dialog, Escape/Cancel work, and no remote deletion happens before confirmation. The view returns after Cancel without a new analysis.
5. An image without text reports No Text Found in the toggle hint; malformed/oversized images produce a short retryable error. Copying ordinary Library images/URLs remains available when Live Text is off or unsupported.
6. macOS 13+ supported devices enable the control. On macOS 12/unsupported systems, the control is disabled and ordinary screenshots/Library must still launch. This older-system compatibility is not established by compilation alone.
7. Analysis is opt-in and in-memory; app logs must contain no extracted text/image payloads. No user image/draft is modified. Native Copy intentionally writes only the selected text through macOS.

Current scope: Library image previews only; video and the annotation editor retain their existing interactions.

## C180 follow-up (installed retest required)

- Keep Live Text visible while preview loads, when switching Local/FTP and with no image; it disables without a usable image.
- Enable Live Text: exactly one image appears. Wheel/pinch zoom and native text selection/Copy operate on that same image. Disable it and verify ordinary preview zoom returns.
- Zoom repeatedly, change images while pinching, toggle Live Text and close/reopen Library. Verify no crash, stale image or native overlay above confirmations.
- On an error, use Settings → Open Logs Folder. Report the build, operation, stage and timestamp in errors.log. After a native crash, reopen once so the sanitized macOS crash classification can be recorded; the original report stays in macOS DiagnosticReports.
