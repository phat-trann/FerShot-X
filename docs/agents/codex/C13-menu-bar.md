# C13 persistent menu bar icon

Enabled Tauri's existing tray-icon feature without upgrading any locked packages. Added a main-window-only command to create/show/hide Ferby's menu bar icon, with Show, primary/area/window capture, manual scrolling and guarded Close actions. Existing native menu routing handles these events once. No tray plugin or JavaScript dependency added.

Application preferences now expose Show in menu bar; changes apply immediately and Save retains them. Startup applies the saved value; closing hides the icon. Notifications and launch-at-login remain capability-disabled.

Checks: TypeScript no-emit and locked offline Rust compilation passed. Lock comparison: zero packages removed/upgraded, zero additional packages. Tests: NOT RUN — deferred by user. No tray/native capture action executed. Formatting/lint delegated to Copilot H01.

Original controls are static T07 evidence; exact Shottr icon/menu/lifetime behavior remains UNKNOWN. USER_WAIVED_REVIEW; later overall review required. MVP acceptance remains 68.75%.
