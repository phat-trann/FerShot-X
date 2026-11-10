# C68 macOS workflow and diagnostics audit

Codex C67/root-wiring belongs to request `macos-workflow-20261109`; ownership was not inherited. Shared source changes require its release or explicit stopped-session handoff.

Autostart already uses tauri-plugin-autostart through the native application-services adapter. Preserve packaged-app checks and explicit user toggles.

Diagnostics must move into Settings with retention days and Open Logs Folder only. Persist errors/unhandled failures, excluding cancellations and successful operations. Apply retention on startup, periodically and on reads even when no errors arrive. Preserve corrupt files; keep size bounds and private file permissions. Include timestamp, product/build, operation, stable error classification and static troubleshooting guidance without credentials, image data, paths or URLs.

Acceptance must cover 80% monitor work-area geometry including Retina; close hides without destroying documents/queue; Command-Q exits; completed capture Copy/Save/Upload hides, while cancelled Save and failures remain visible. Use native vibrancy, accessible shadcn/Radix controls, Tailwind, Lucide and reduced-motion-aware Motion.

Sources: native diagnostics/lifecycle/application-services and frontend diagnostics/preferences/workspace. Apple HIG and official Tauri autostart documentation consulted. No shared edits or runtime validation performed. Phase-2 acceptance remains 55%.
