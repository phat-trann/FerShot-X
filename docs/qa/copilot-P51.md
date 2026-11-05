# P51 Capture Session Regression Tests

Added four public-API regressions covering late-frame release after
cancellation, stale-session suppression after a newer start, immutable stitch
snapshots with single-release cleanup, and duplicate acquisition suppression.
Tests use deferred synthetic adapters only; no OS capture, clipboard, network or
producer implementation changes were made.
