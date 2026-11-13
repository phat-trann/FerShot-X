# C153 Fit marker and text metrics

Fit is now a small labelled downward teardrop above the shared zoom slider. Its pointer aligns to actual native range thumb travel, including 8px endpoint insets. The marker reads reactive Fit state, updates when the viewport changes and invokes the existing explicit camera-reset/Fit action. Other zoom/popover interactions remain intact.

Inline text’s height is one font-size line instead of 1.2×, removing extra vertical space while keeping zero padding, caret, annotation font/color and zoom transforms.

Validation: TypeScript, two UI source guards and five browser cases pass. Geometry checks verify marker alignment and viewport updates; Fit gives the advertised percentage. Text descender samples (gyp) have matching line/font height at 100% and 200%; existing inline editing, undo/redo, export/reopen and zoom/Escape checks pass. Marker screenshot inspected. Whitespace check passes. No build, native OS/server operation or publication; visual acceptance pending.
