# C172 — Release 1.4.0

User accepted the candidate and authorized cleanup/version/publication. Release C160–C171: screen/area recording, optional audio/mouse metadata, layered video editing, image insertion, FTP/history, Stop recording hotkey, magnetic alignment and predictable window sizing. Ordinary tray icon/menu remains.

Removed unused stop/event-listener frontend exports, duplicate pointer/click CSS and redundant dev dependency. Corrected stale Hotkeys accessibility count and video docs. Product version is synchronized to 1.4.0; existing ARM-only main-triggered release/signing/updater configuration is unchanged.

Validation: all 442 renderer unit tests, 24 video browser cases, focused image regressions, 36 focused native checks, 10 version-script checks, TypeScript including unused declarations, renderer build and release-profile native compilation. Tests use generated media/injected IPC, with no real capture/audio/server/permission operations. Publication uses normal main push; CI status is separate. USER_WAIVED_REVIEW only.
