# C17 explicit repeat-area reset

Added clearRepeatArea() to the existing capture-session controller so native geometry/pixel mismatches permanently invalidate the remembered rectangle, including mismatches where the reported display geometry remains unchanged. No frame acquisition/stitching behavior changed.

Checks: TypeScript no-emit passed. Tests: NOT RUN — deferred by user. Formatting/lint delegated to Copilot H01. USER_WAIVED_REVIEW; later overall review required. MVP acceptance remains 68.75%.
