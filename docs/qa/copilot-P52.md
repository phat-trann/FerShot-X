# P52 Recognition Workflow Regression Tests

Added four public-API regressions covering stale recognition suppression,
deselected-source cancellation, immutable source snapshots with OCR
line-break formatting, and stale language-list suppression. Tests use deferred
synthetic backends only; no native OCR, clipboard, URL, network or producer
implementation was changed.
