# C80 editor and window polish

Removed toolbar Open Image and active Pin routes/menu/native registrations. Drawing tools persist after creation; Select/Escape remains available with immediate handles. Added group spacing, tool separators, width-aware overflow, fixed status/numeric-property widths and shared button/control/panel dimensions across three windows.

Blur/Magnifier sampled content hides during move/resize and resamples on release; outlines remain. Cancellation restores geometry/artwork. Switching to Select preserves selection and synchronously refreshes canvas hit regions.

Settings creation/reopen now uses the shared foreground restoration path also used by Edit/Library. Always on top now propagates to Library. Native focus changes require a requested build/manual retest.

Validation: nine scoped unit tests, 31 final browser cases and no-emit TypeScript passed; version 1.0.0 consistent. Screenshots inspected. No application/native build, formatting or lint. Earlier selection-timing failures corrected before final rerun. Phase-2 acceptance stays 85% before/after.
