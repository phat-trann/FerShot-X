# P61 Preferences Workspace Regression Tests

Added three independent regressions for capability-disabled preference
preservation, controlled save callback payloads, and clean-workspace adoption
of an external snapshot. Checked the current A37 packet and claim; no
producer code was changed. Tests use synthetic preference snapshots only.

Correction: typed the save mock from the public `PreferencesWorkspaceProps`
callback signature and omitted the invalid nullable external snapshot value.
Validation: Node 26.13.0 targeted Vitest passed, 2 files and 4 tests.
