# C67 macOS workflow and error logging

Took over stopped C67/root-wiring by explicit user handoff. Close now hides the editor; Command-Q exits, and Dock/menu reopening restores the existing workspace. Startup geometry uses 80% of monitor work area. Captured-image Copy/Save/Upload hides on successful output/submission; cancellation/failure stays visible. Derived capture images inherit this policy. Successful capture reopens an already hidden editor.

Settings → Advanced replaces the log viewer with retention (1–90 days) and Open Logs Folder. Only failures/unhandled errors persist, with timestamps, version/build/platform, stable codes and static recovery guidance. Startup/hourly/read cleanup preserves malformed files and private permissions; no secrets, paths, URLs or image content are recorded.

Installed shadcn/Radix primitives, Tailwind, Lucide and reduced-motion-aware Motion are wired into Settings/main actions. Native vibrancy uses Tauri's window-vibrancy integration. Existing tauri-plugin-autostart remains the startup provider. Apple HIG consulted.

Checks: 52 Rust tests, 43 integrated browser tests and 10 scoped frontend tests passed; Settings/log visual checks repeated after CSS corrections. TypeScript/Vite and Tauri bundle validation are recorded in C67-macos-candidate.json. Native window/menu/startup runtime checks remain manual. USER_WAIVED_REVIEW; no formatting/lint. Phase-2 acceptance: 55% before/after.
