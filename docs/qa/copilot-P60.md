# P60 Layout Workspace Regression Tests

Added three independent regressions for invalid canvas dimensions and disabled
export, backdrop-driven output recomputation, and measurement unit state
switching. Checked the current A36 packet and claim; no producer code was
changed. Tests use synthetic layers and a non-OS canvas source.
