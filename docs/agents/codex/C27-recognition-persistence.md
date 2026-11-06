# C27 recognition preferences integration

Consumed current external Anti A43 codec without editing its files. Added versioned native OCR preferences in the bounded atomic store, main-window load/save commands and strict native mode/tag validation. The workspace reloads saved language priorities/line-break choices, maps normalized tags to actual runtime language identifiers and exposes Save/Reset. Explicit profile recognition supports text, QR or sequential text+QR; no automatic recognition, copying or URL action occurs on load. A48 will replace the inline profile controls through the same state.

Tests/typechecks/builds/setup: NOT RUN — deferred by user. Source read only. Formatting/lint delegated to Copilot H01. Original primary-language/line-break declarations are T02 static evidence; exact target processing remains UNKNOWN. USER_WAIVED_REVIEW; later overall review required. MVP acceptance remains68.75%.
