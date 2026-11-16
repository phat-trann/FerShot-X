# C162 — Stop failure and recording recovery

Installed logs confirm C161 finish_recording failures after 0–3 ms, before document metadata exists. Remove the pre-stop output-detachment gate and stop the attached stream directly. Preserve consumed terminal events and recognize only ScreenCaptureKit's known already-stopped/user-stopped acknowledgements. Require a complete MP4 container and valid asset metadata; writer failures remain errors. Add distinct stop-stream diagnostics. Generic Reopen stays suppressed during recording.

A bounded guarded background pass restores finalized abandoned originals into Local without overwriting drafts or auto-uploading. Library retains recording errors across refresh/reopen and selects Local for recovery.

Validation: 14 native synthetic callback/container/generated-media tests, 10 injected browser cases and TypeScript passed. No live capture/audio/server/permission operations, bundle, version change or publication. Installed Screen/Area stop-to-Edit still needs user retest. USER_WAIVED_REVIEW; no independent approval claimed.
