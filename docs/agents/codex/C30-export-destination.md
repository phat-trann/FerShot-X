# C30 saved export destination integration

Connected completed external Anti A45 controls to main-window-only folder selection and bounded private atomic destination preferences. Frontend receives a display label, never a writable path. Basename edits persist only through Save export name; folder selection/reset are explicit. PNG/JPEG exports now use the configured folder and deterministic bounded numbered collision names; absent configuration preserves the existing Save dialog. Existing atomic non-clobber image save remains authoritative, including races/symlinks. Invalid folders fail rather than silently writing elsewhere.

Corrected A45's no-folder label to match actual Save-dialog behavior under a free producer claim; historical authorship preserved. No format/lint performed.

Tests/typechecks/builds/setup: NOT RUN — deferred by user. Formatting/lint delegated to Copilot H01. Shottr's folder/default naming/Auto-format behavior remains UNKNOWN beyond T05 static declarations. USER_WAIVED_REVIEW; later overall review required. MVP acceptance remains68.75%.
