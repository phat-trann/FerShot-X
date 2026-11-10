# C69 Library and Edit windows

Library is the visible startup window: 35% Local/FTP rows, lazy real thumbnails, search/keyboard navigation, right preview and explicit Edit. Preview sizing follows the uploader QueuePage/app.css contain/natural-size rules; retained FTP pixels avoid public-URL requests. Edit creates a fresh independent document through a four-item native inbox. The main editor has no sidebar. Settings UI is unchanged.

Native tray actions have system icons; Quit uses Command-Q. Dock/menu reopening targets Library. Capture hides the app windows temporarily, restores them and opens Edit. File/clipboard imports also show Edit. Cache/FTP events refresh Library. Library receives scoped readers/actions, never capture or main image permissions.

Validation: see C69-library-candidate.json. Browser IPC is injected; native window/menu/capture transitions require manual verification. Legacy sidebar-specific browser cases are historical navigation evidence, not current acceptance. USER_WAIVED_REVIEW; no formatting/lint. Phase-2 acceptance remains 55%.
