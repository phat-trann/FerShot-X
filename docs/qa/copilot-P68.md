# Copilot P68

Added independent C23 adapter regressions for source/revision mismatch
rejection with lease cleanup, malformed Unicode response rejection, copied
transport bytes, and abort after a late resolver result. Tests use injected
ports and synthetic metadata only; no Tauri/native calls were used.

Validation: Node 26.13.0 targeted Vitest passed 1 file and 4 tests.
