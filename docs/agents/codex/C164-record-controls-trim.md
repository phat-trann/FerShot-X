# C164 — Recording controls and trim timeline

Added immediate Record Screen/Area hotkeys with persistence/restoration and legacy-map migration. Native menu/global dispatch shares deduplication; active-recording shortcuts stop capture. Tray uses matching white 18px Lucide monitor-play/monitor-stop icons.

Silent captures/inspected media omit Audio rows. Replaced cursor TIFF conversion with bounded CGImage rasterization. Deleted metadata layers/final clips remove their virtualized rows, preserving scroll/playhead. Tracks shrink to 28px; dark draggable masks replace export trim sliders, with keyboard/cancel/undo support. Removed mouse footer switches/color/size and add-layer UI. Cursor style remains contextual to its selected layer.

Validation: TypeScript/native compilation, 105 native synthetic/local tests, 17 focused unit cases and 16 distinct injected browser cases passed; compact timeline screenshot inspected. No live capture/audio/shortcut registration/permissions/FTP, bundle/version bump or publication. Installed cursor/hotkey/audio/trim acceptance remains pending. USER_WAIVED_REVIEW, not independent approval.
