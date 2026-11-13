# C128 Resize, active display and stable metadata

Resize matches the compact reference: text presets, proportional dimensions and one apply button. Removed Crop Region/Cancel/icon actions; Escape/outside click dismisses. Settings utility icons are unframed after their text, including logs on one row. Library reserves the metadata line and ellipsizes names so delayed dimensions/size do not move preview bounds.

Edit placement resolves the pointer's monitor and centers in its work area using target-scale physical pixels. Presentation no longer recenters on the hidden editor's previous monitor. Added pure placement cases for negative origins/mixed scales; native compilation/execution is intentionally deferred under the no-build instruction.

Validation: TypeScript, all 449 unit tests and focused browser regressions pass, including delayed FTP metadata, resize/reopen drafts and utility callbacks. Screenshots inspected. Native multi-display acceptance remains pending. No build, real OS/server actions, commit or push.
