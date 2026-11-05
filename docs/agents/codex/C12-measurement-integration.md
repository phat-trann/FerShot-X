# C12: Workspace PX/PT measurement and raster imprint

Integrated the unchanged independently reviewed A27 overlay into the actual Workspace. The Measure image control opens source-image coordinate inputs and an explicit pixels-per-point value (initial user-editable 1). Units switch between PX/PT/both; invalid/blank scale and empty selections disable imprint. State resets with the selected document and is mutually exclusive with annotation/color-inspection controls. This version uses coordinate inputs, not pointer-drag selection.

Imprint Dimensions creates a new bounded PNG raster, renders existing annotations through the reviewed raster seam, draws a measured rectangle/label and retains the original document/history. The renderer recomputes measurement from geometry rather than trusting caller-provided label strings, validates image limits/dimensions, bounds encoded output and clears its temporary canvas on success/failure. Very small output images can clip a label; no automatic resizing or original-file modification occurs.

Scale conversion and the label/badge rendering are explicit Ferby behavior, not verified Shottr defaults. No display scale is inferred from image size. Original UI inventory establishes PX/PT affordances only; original runtime pixels/measurement appearance remain UNKNOWN. No new REA/runtime claim is made by this integration.

Actual validation: 9 scoped unit tests passed across integration/renderer/A27/P02. Playwright real-browser pixel test passed; a 5-file browser regression run passed 10 tests across measurement, editor/export, clipboard mocks, pin and preferences. It checks changed output pixels, unchanged original pixels/dimensions, independent library entries and selection reset; it invokes no real native actions. Scoped strict typecheck for root measurement source/tests passed with the configured test setup included. Global typecheck was attempted and still has existing A37 unused-import and P61 fixture errors; no production application build pass is claimed.

Evidence correction: the initial A27/P02-only run had 6 tests, not 8 as mistakenly recorded in the first review note. A fresh append-only review record/report corrects the count without rewriting immutable records. The later four-file measurement run has 9 tests.

Formatting/lint delegated to Copilot H01 with explicit completed root-file handoff. New Codex root wiring awaits independent review. Broader C12 effects/composition integration remains incomplete; no MVP percentage or full parity acceptance was raised.
