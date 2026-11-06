# C13 native desktop menu

Added native Ferby/Capture/Image/Edit menus using the existing frozen Tauri menu APIs. Capture routes invoke existing user-action handlers; Image routes copy/save/pin or reveal print/drag controls for the current main workspace. Standard text cut/copy/paste/select-all remain native. Close invokes the existing source-aware confirmation policy; no direct quit bypass was introduced.

Menu routes have their own listener so intentional menu actions work while text fields are focused; busy capture/scroll and shortcut editing still block conflicting work. Image actions are ignored when a child window has focus.

Checks: TypeScript no-emit and locked offline Rust compilation passed. Tests: NOT RUN — deferred by user. No menu, clipboard, capture or other OS action executed. Formatting/lint delegated to Copilot H01.

Original declarations: T05-export-audit.md and T07-settings-sharing.md. Exact target menus/order/accelerators remain UNKNOWN. Tray icon, notifications and launch-at-login remain capability-disabled. USER_WAIVED_REVIEW; later overall review required. MVP acceptance remains 68.75%.
