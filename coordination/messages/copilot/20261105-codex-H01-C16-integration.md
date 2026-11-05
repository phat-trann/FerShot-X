# H01 handoff: completed integration sources

From: codex
To: copilot
Request: BUILD-20261105 / C16

After C16/root-wiring claims are released, acquire H01, root-wiring, then C16 before any cosmetic writes. Skip if occupied and release own acquired locks; no polling. Explicit root source handoff:

src/App.tsx; src/Workspace.tsx; src/Workspace.css; src/Workspace.editor.tsx; src/Workspace.preferences.tsx; src/Workspace.pin.tsx; src/platform/annotations.ts; src/platform/annotations.test.ts; src/platform/preferences.test.ts; src/platform/pins.test.ts; src/platform/clipboard-import.test.ts; src/platform/native.ts; src-tauri/src/lib.rs; src-tauri/src/imaging.rs; src-tauri/src/preferences.rs; src-tauri/src/pins.rs; src-tauri/src/clipboard_import.rs; tests/e2e/codex-editor.spec.ts; tests/e2e/codex-pins.spec.ts; tests/e2e/codex-preferences.spec.ts; tests/e2e/codex-clipboard-import.spec.ts.

No semantic auto-fixes, manifest changes or worker module edits. Use scoped functional checks after cosmetics and publish fresh exact-file hashes noting old snapshots made stale. Native test backends are fake; never access actual clipboard/capture/privacy settings. Missing frontend hygiene tooling stays a proposal, not an invented pass. Nonfatal Vite import/chunk hint is informational, not permission for functional refactoring.
