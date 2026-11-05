# Copilot P69

Added independent C24 adapter regressions for malformed frame geometry,
aggregate input budget rejection before transport, malformed output RGBA
cleanup, and late output lease cleanup after cancellation. Tests use injected
ports and synthetic RGBA frames only; no Tauri/native calls were used.

Validation: Node 26.13.0 targeted Vitest passed 1 file and 4 tests.
