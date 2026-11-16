# C160 screen recording candidate

Implemented fullscreen/area native MP4 recording (macOS 15+), audio toggles, bounded session-only mouse metadata, tray Stop/time and graceful Quit. Area coordinates come from native selection; secondary/negative-origin/Retina geometry is validated. Video Edit supports trim, mute, timed draggable/resizable highlights, cursor/click effects, undo/redo, Copy/Save and FTP. Local retains original/draft; FTP supports MP4 naming/retry/history/HTTPS authenticated preview and thumbnail-only success retention.

Uses pinned Rust objc2/AVFoundation/Core Animation and lazily loaded ScreenCaptureKit; no Swift/FFmpeg. Existing image paths and updater/signing state remain intact.

Validation: TypeScript/native check, 428 unit tests, 66 distinct browser cases and seven native video/queue tests pass. Native generated-pixel MP4 verifies trim, baked highlight pixels, poster and unchanged original. Visual screenshot inspected. Real display/area/audio/FTP/permissions remain pending installed acceptance; no app bundle or publication. Checklist: docs/releases/video-manual-acceptance.md.
