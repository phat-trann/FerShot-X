# C66 native UI check (pending)

Use the development bundle identified by C66-menu-candidate.json. This checklist is not recorded as passed by source review or browser tests.

- Click the menu-bar icon: verify the supported capture entries, More submenu, Settings, startup state (where supported) and Quit. OCR/license/promotion/delayed items are absent.
- Open Settings from the menu and main window. Reopen focuses the same window; closing it leaves the workspace/images intact. Verify General/Hotkeys/Uploading/Advanced and light/dark appearance.
- Save a format/quality change; the existing workspace uses it without restart. Check the floating-editor option keeps Settings reachable.
- If desired, change Launch at Startup explicitly; verify its menu checkbox matches system state. This changes the app's own startup entry and was not automated.
- Open File from More, then cancel another picker. Clipboard/capture actions must originate from explicit user actions. Repeat enables only after valid Area metadata.
- Quit with an open session: cancel once, then confirm if ready. Existing FTP retry payloads remain on disk; real transfer/restart acceptance is tracked separately.
