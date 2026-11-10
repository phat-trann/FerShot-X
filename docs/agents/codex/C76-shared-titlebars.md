# C76 shared custom title bars

Edit, Library and Settings now use the same draggable custom title component, white uploader symbol and left-aligned FerShot X — section title. An 88px inset reserves macOS traffic lights. Library branding is removed from the sidebar; Refresh remains available beside preview actions. Settings retains its version indicator.

Library and Settings use hidden native titles with overlay title bars and narrowly scoped start-dragging permission. Existing image-command/window boundaries remain intact.

Validation: no-emit TypeScript passed; 30 injected Playwright editor/Library/Settings cases passed; product version 1.0.0 check passed. Inspected screenshots of all three headers. Native builder APIs verified against installed Tauri source. No application/native build, formatting or lint run. Native overlay, traffic-light placement and actual dragging require manual verification after an explicitly requested build.

Phase-2 acceptance remains 85% before and after.
