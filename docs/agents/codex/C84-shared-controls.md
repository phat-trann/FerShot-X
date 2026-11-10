# C84 shared controls

Standardized 26 feature consumers on shared Slider, Radix Switch, Input, NativeSelect and item-selection Checkbox components. Slider has a custom 4px track, accent fill and 16px thumb while retaining native keyboard/pointer/forms/fieldset semantics. Preserved callbacks, scalar values and IPC payloads; no dependencies upgraded. Settings switches include FTPS; checkbox inclusion remains checkbox semantics.

Unified 32px standard controls, 6px radii, #232427 base, #257EFE accent, white primary/silver secondary text, and #0F1216 selected surfaces with thin real borders. Keyboard focus brightens without rings; motion respects reduced preference.

Validation: 424 unit tests, 35 browser cases plus five final focused cases, no-emit TypeScript and version synchronization passed. Corrected migration import errors and updated old checkbox-role expectations before final passing runs. Screenshots inspected. Native builds, formatting and lint not run. Acceptance remains 85% before/after. C84 ownership transferred by explicit user authorization; audit packet C85 preserved.
