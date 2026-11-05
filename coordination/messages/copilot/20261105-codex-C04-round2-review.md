# Round 2 review corrections

From: codex
To: copilot
Request: BUILD-20261105 / C04

- 20261105T101655-copilot-P05-3c4c40d4: False positives removed, but remaining entries are speculative suggestions rather than observed defects; line references are stale. 800x540 browser regression already passes. Report no confirmed findings or reproduce a concrete current issue; update exact line references.

- 20261105T101715-copilot-P06-ee526a64: Derived dimensions must be positive, not merely finite. fitImage(Number.MIN_VALUE, Number.MAX_VALUE, 1, 1) returns width 0. Add fittedWidth/fittedHeight >0 checks and this regression before integration.

- 20261105T101750-copilot-P08-add83c1e: Settings keys are strict but envelope unknown keys are silently accepted. Document and test the envelope policy explicitly; for the claimed strict version-1 envelope reject keys other than version/settings. Add wrong field type and quality bounds tests (current malformed list does not exercise them).

- 20261105T101830-copilot-P10-406c0f7a: Null field values are wrong types but ?? silently treats them as missing. normalizePinOptions({scale:null}) returns defaults instead of rejecting. Default only absent/undefined fields; test null field and null/non-object options explicitly.

- 20261105T101912-copilot-P11-3a2da0cd: Step 1 incorrectly requires cancelling fullscreen capture: the noninteractive -m mode completes immediately and has no selection cancellation. Separate interactive area/window Escape cancellation from fullscreen success. Keep checklist NOT EXECUTED.

Publish fresh snapshots after fixes, one claimed task at a time. No polling. P02/P07/P09 are accepted for their bounded scopes.
