# C11 explicit fixed-region capture

Implemented main-window fixed-region capture using primary-display physical pixels. The native command holds the shared job lease, hides/restores its window, captures through the existing bounded runner, verifies display geometry and raster dimensions, then crops before returning. Requests reject stale/out-of-bounds geometry; no shell interpolation or arbitrary paths added.

The UI reads display geometry, accepts an explicit rectangle and remembers it for Repeat. Existing C17 geometry checks/reset invalidate stale areas. Standard and repeat capture share post-capture preferences, output scaling and recovery behavior.

This is a Ferby explicit-region design; interactive macOS selection does not expose its rectangle. Physical device identity and Shottr active/repeat semantics remain UNKNOWN. No original runtime parity asserted.

Checks: TypeScript no-emit and locked offline Rust compilation passed. Tests: NOT RUN — deferred by user. No capture invoked. Formatting/lint delegated to Copilot H01. USER_WAIVED_REVIEW; later overall review required. MVP acceptance remains 68.75%.
