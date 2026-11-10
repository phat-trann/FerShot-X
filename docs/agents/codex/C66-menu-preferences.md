# C66 menu and separate Settings

Implemented the requested hierarchy using existing capture, scrolling, repeat, window, file, clipboard and startup actions. Unsupported OCR, licensing and promotion entries are omitted. Repeat follows validated area availability; Quit retains session confirmation.

Settings is a reusable native window with General, Hotkeys, Uploading and Advanced tabs, accessible keyboard navigation and light/dark layouts. Atomic preference saves synchronize the workspace; FTP drafts survive tab changes. Window guards preserve image/queue restrictions, and shortcut recording suppresses global capture dispatch.

Validation: 47 native, 37 integrated browser and 40 distinct scoped frontend tests passed. TypeScript/Vite, Tauri bundling and strict ad-hoc signature verification passed. C66-menu-candidate.json binds source and binary hashes. Native macOS menu/focus/picker/startup interactions remain manual; browser checks use injected IPC.

Anti dispatch is closed; reviewed historical work is preserved. USER_WAIVED_REVIEW marks Codex changes. Formatting/lint not run. Phase-2 acceptance: 55% before/after.
