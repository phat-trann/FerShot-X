# C180 — recording exclusion, Live Text and diagnostics

USER_WAIVED_REVIEW; installed acceptance pending. No publication/version change.

Recording holds an owned job/stop-sender lease through finalization; failure/unwind releases both. Tray capture/start entries disable; native IPC and renderer dispatch also block competing capture/start actions. Dedicated Stop remains available.

Live Text retains its toolbar slot, hides web artwork, uses a native sibling outside WebKit gestures, fits from immutable image dimensions and defers/retains teardown. Installed 1.5.0 crash evidence: SIGSEGV in AppKit gesture cancellation. These are source-level lifetime corrections, not proof of installed crash elimination.

Diagnostics observe registered IPC failures, classify Live Text stages/timeouts, record native panic/start failures and import a sanitized recent macOS crash classification after restart. Bounded enum metadata only; no raw payload/text/credentials/crash reports. Existing retention remains.

Checks: 442 unit tests; TypeScript unused checks; 11 injected browser cases; 28 recording, 9 diagnostics, 3 menu, 4 bridge, 9 shortcut tests; 4 pure Swift checks. Formatting/lint delegated to H01. MVP ledger unchanged.
