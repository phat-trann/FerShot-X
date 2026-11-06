# C34 native color-copy integration

Added integrator-owned validated HEX/RGB/RGBA text formatting and the existing main-window text clipboard boundary. RGBA preserves the sampled alpha ratio; no text-color extraction or target algorithm inferred. Connected explicit Copy HEX actions for both pixel and average-region results using workspace operation guards. No clipboard write occurs while reading/sampling or loading controls.

A50 owns the full format selection controls; its external source is absent at this boundary. The adapter is ready for that UI without speculative imports or edits to producer folders.

Tests/typechecks/builds/setup: NOT RUN — deferred by user. No actual clipboard operation executed. Formatting/lint delegated to Copilot H01. USER_WAIVED_REVIEW; later overall review required. MVP acceptance remains68.75%.
