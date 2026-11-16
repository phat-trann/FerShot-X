# C163 — Layered video timeline

Pinned React Timeline Editor 1.0.0 supplies virtualized ruler/clip dragging/trim handles and playhead. Video/audio/cursor/click/highlight tracks persist enabled/lock states and independent source/project spans. Added split, duplicate, move/trim, delete, metadata layer add/duplicate/delete, video ripple deletion, undo/autosave, timeline zoom and system/custom arrow styles. macOS Arrow reads public NSCursor artwork/hotspot; baked cursor pixels remain noneditable. Lazy video loading preserves screenshot startup.

Native AVMutableComposition uses the same spans as the project playback clock; mapped pointer boundaries/click transitions avoid gap leakage and invented held clicks. Generated MP4 checks verify reordered colors, extended duration, cursor artwork and immutable originals.

Validation: TypeScript, 18 native synthetic tests, 7 timeline unit tests and 14 distinct video and 4 image regression browser cases passed. Inspected C163 timeline screenshot. No real capture/audio/server/permissions, bundle/version bump or publication. Installed audiovisual/FTP acceptance remains pending. USER_WAIVED_REVIEW, not independent approval.
