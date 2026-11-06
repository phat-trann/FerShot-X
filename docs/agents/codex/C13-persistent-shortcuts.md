# C13 persistent shortcut assignments

Implemented a native versioned shortcut-assignment sidecar with the same bounded private atomic persistence used for application preferences. Native parsing rejects unsupported actions, unmodified/reserved/duplicate bindings before writing. Main-window IO runs off the UI thread under the preference gate; registration remains under the shortcut registry gate.

The app loads saved assignments when no active bindings exist. Save/Forget change persistent assignments; Apply/Clear control active registrations independently. No keys are registered automatically during startup. Active faulted state takes precedence so cleanup remains accessible.

Checks: TypeScript no-emit and locked offline Rust compilation passed. Tests: NOT RUN — deferred by user. Formatting/lint delegated to Copilot H01. No native shortcut/OS actions executed. Original defaults, persistence and restart semantics remain UNKNOWN. USER_WAIVED_REVIEW; later overall review required. MVP acceptance remains 68.75%.
