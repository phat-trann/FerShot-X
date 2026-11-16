# C171 — Dedicated Stop recording shortcut

Removed C170 app-logo tint/badge/click-to-stop state and handlers per the latest user instruction. The original tray template icon, tooltip and left-click menu remain throughout recording; native macOS controls are untouched.

Settings Hotkeys now has a separate Stop recording row with immediate assign/clear and persistent native registration/restoration. Dispatch stops the existing recording worker directly, without depending on a visible renderer, and does nothing while idle. Existing Screen/Area toggle behavior remains. Frontend and native migration retain five/eight/ten-action maps and initialize the new action unassigned.

Validation: TypeScript, 11 focused renderer tests, injected browser assignment/clear and 9 native fake-registry shortcut tests passed. No real capture/global registration/server/permissions, bundle/version bump or publication. Installed hidden-app shortcut/stop-to-Edit acceptance remains pending. USER_WAIVED_REVIEW only.
