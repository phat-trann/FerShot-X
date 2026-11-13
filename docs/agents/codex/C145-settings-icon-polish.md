# C145 Settings icon polish

Removed the temporary development updater preview. New version renders only from actual updater state; matched version columns and explicit install remain unchanged.

Open Logs Folder is now icon-only after days in the retention row. The input keeps an explicit linked label; the action is outside that label. Autosave/error behavior is preserved.

Folder actions no longer attach legacy per-feature button classes, blue hover borders or secondary opacity; shared Button styling owns normal/hover/disabled states. Tooltip positioning snaps its final left edge to device pixels without transformed text.

Validation: TypeScript and six injected browser cases pass, covering absent/actual available updates, aligned versions, real updater apply, neutral folder hover borders, enabled opacity, tooltip transform, logs row alignment, folder/reset callbacks and Settings layout. No build, native/OS/server operation, commit or push. User acceptance pending for the latest visual changes.
