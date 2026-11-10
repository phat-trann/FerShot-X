# C93 manual feedback corrections

Recorded 17 explicit user passes separately from pending changes. Edit now requests 80% work-area dimensions; version badges use identical fixed spacing. Touchpad wheel pans, Ctrl-wheel/WebKit pinch zooms, Escape/Command-C copies then hides after success, and gesture/crop/input cancellation retains context. Freehand stroke width is restored. Interface text selection is disabled except editable controls, with larger/readable UI typography.

Scrolling now resolves/focuses the window under the OS-provided selection, reports unchanged content explicitly, restores visible Edit on failure and records typed stages. Existing local capture failures had only `other`, so their exact historical cause is unknown. Technical logs add allowlisted operation, stage, duration and frame count plus private UTC errors.log; no raw errors/arguments/secrets are recorded.

TypeScript, 439 unit tests and 56 synthetic browser cases passed. Native compilation, OS capture/permissions and server tests remain deferred. Scroll success, native 80% geometry and readable log output require a fresh authorized build/retest. Acceptance remains 85%.
