# A35: Capture workflow production takeover

The user explicitly reassigned Antigravity production to Codex. This is a new Codex snapshot; historical Antigravity packets/approvals are preserved and do not approve these changes.

Fixed release-callback identity changes revoking the active source, cross-instance operation-token collisions, cross-capture effect suppression when a document ID is reused, and cancelled plans restoring released document state. Release uses the latest callback and detaches ownership before cleanup; effect history is bounded to the current capture. Preview actions now await adapters, suppress duplicate in-flight actions, mark effects only after success, expose recoverable errors and ignore superseded results. Configured missing adapters and empty-message rejections fail explicitly. Complete snapshot uses the actual `.tsx` source/test paths plus CSS/index.

Before fixes, two focused regressions failed (release on callback rerender; effects skipped in separate mounts). After fixes, the four-file scoped test result is recorded in the packet. Tests use synthetic documents, fake timers and injected callbacks; no native capture/clipboard/save was invoked.

Global typecheck was attempted and failed in A37 (unused DEFAULT_SETTINGS) and P53/P54 fixture typing; no A35 diagnostic was emitted. P53/P54 received concrete changes-requested decisions; A37 cleanup is delegated to H01. Application build was not run after the failed prerequisite. Formatting/lint delegated to Copilot H01.

Copilot P62/P63 independently cover preview callback failures and lifecycle behavior after the A35 claim is released. Source remains component-local and not wired into the root application by this packet. Final native/parity acceptance and independent approval remain open. Callback rejection may represent an uncertain external effect; no native exactly-once guarantee is claimed. The underlying A24 planner still maintains its existing global token-id history, which is outside this change's scope.
