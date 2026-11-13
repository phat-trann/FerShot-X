# C127 Settings checkboxes and Updates

Settings now uses shared control-first CheckboxField options with linked labels, native disabled semantics and unchanged autosave. Removed the Done/footer region; failures appear inside content, and blur/unmount flush pending writes.

Updates shows the existing app logo, Current version with an adjacent icon-only check, and actual current/new-version status below. Test Notification and its renderer-only listener are removed. Automatic native update notifications, download progress and explicit install/restart remain unchanged.

Validation: TypeScript, 11 targeted unit tests and 25 browser checks passed before the continued C128 polish; final combined checks passed after it. Label clicks, disabled fieldsets, action isolation, persistence, lifecycle flushing, errors and updater flow are covered. Screenshots inspected. No build or real OS/server/credential actions, commit or push; user acceptance pending.
