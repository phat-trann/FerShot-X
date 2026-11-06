# C32 window appearance adapter

Implemented source-image decoding, A26 transparent/solid/explicit-trim rendering, bounded PNG output and temporary-canvas cleanup in an integrator-owned adapter. A47 owns only controlled options; root supplies actual image pixels. No guessed window provenance or automatic trim heuristic. Source adapter is ready; A47 is absent at this task boundary, so no speculative import or producer edit added.

Tests/typechecks/builds/setup NOT RUN — deferred by user. Formatting/lint delegated to Copilot H01. USER_WAIVED_REVIEW; later overall review required. App controls integration remains pending A47; MVP acceptance remains68.75%.
