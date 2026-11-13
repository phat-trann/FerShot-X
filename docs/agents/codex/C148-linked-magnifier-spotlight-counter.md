# C148 Spotlight, linked lens and counter

Spotlight dimming hides during drag/resize and restores on release/cancel. Magnifier draws an ellipse, creates an equally sized offset lens and clipped connector, supports independent lens/source movement and keeps magnification sampling tied to the source. Optional sourceCenter/radiusY fields preserve old circular drafts. Mapping, selection bounds and PNG export retain elliptical geometry and both positions. Counter pointer direction is continuous; keyboard steps 15° or Shift 1° without rotating its number.

Validation: TypeScript and full 422-case unit suite passed, followed by five focused cases after export/selection refinement. Seven browser cases passed; final two-case rerun checks exported blue source pixels, undo/redo, reopening draft, Spotlight release/Escape recovery and arbitrary counter angles. Screenshot inspected. Existing Blur/lens manipulation and annotation resize regressions pass. Version/whitespace checks pass.

No build, real OS/server operations or publication. Version remains 1.2.2 pending user acceptance of new interactions.
