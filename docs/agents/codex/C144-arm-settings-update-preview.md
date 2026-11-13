# C144 Apple Silicon and Settings polish

Release CI builds only ARM64. Manifest verification rejects Intel/Universal targets and inconsistent installer aliases; archive verification requires the expected arm64 binary/certificate. Historical validators/releases remain compatible. README identifies current Apple Silicon support.

Foreground presentation now shows/focuses only the requested window, removing app-wide unhide that could reveal retained Edit/Library when opening Settings. Native build/runtime validation was not performed. Edit delete hint/title reads Delete.

Current/New version use identical row/control columns. User-requested DEV-only mock shows the next patch if no real update is available, with install disabled; no fake controller state, notifications or IPC. Disable with previewUpdate=0 until removed after acceptance.

Validation: TypeScript, 21 Python signing/manifest cases, two injected browser cases and YAML single-ARM assertions pass. Version-column coordinates match; screenshot inspected. Real updater apply still passes. No build, live OS/server actions or publication. Native focus/hidden-window restoration requires manual verification.
