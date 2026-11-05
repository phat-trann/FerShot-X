# C04 round 2 checkpoint

Status: PARTIAL. Request: BUILD-20261105. Date: 2026-11-05.

Nine fresh worker packets available at this checkpoint were reviewed against their actual current files. No stale implementation packet was approved; no polling/waiting for future worker results.

## Accepted and integrated

- P02: finite-result checks fix the reported overflow cases; accepted for pure geometry scope.
- P07: safe-integer/subtraction-based crop validation accepted and wired into `transformImage` before browser rasterization/native IPC. Rust still validates all incoming bounds. Browser regressions distinguish local invalid bounds from an injected native failure, then recover with a valid crop.
- P09: four independent public-model history regressions accepted.
- A01: current main-display caption, callback modes, disabled state and keyboard behavior accepted. The workspace now mounts CapturePanel instead of duplicate buttons. A disabled parent fieldset blocks all capture actions during other jobs; capturing-only state avoids claiming capture is active during clipboard/save operations. Root layout adapts the component to the narrow sidebar without editing worker CSS.

## Corrections requested

- P05: remaining speculative observations are not confirmed defects; source line references are stale, and the minimum-size browser check already exists.
- P06: a finite derived width can underflow to zero. Require positive derived dimensions and regression for MIN_VALUE/MAX_VALUE inputs.
- P08: clarify/test strict envelope unknown-key policy and add missing wrong-type/quality-boundary tests.
- P10: explicit null fields are incorrectly defaulted rather than rejected as wrong types.
- P11: fullscreen `-m` capture is noninteractive; split fullscreen success from area/window Escape-cancel checks.

Exact decisions are saved under coordination/reviews/decisions; durable feedback is in coordination/messages/copilot/20261105-codex-C04-round2-review.md. Authors retain their owned implementation files. Missing/not-current A02-A04 and later A06-A10 remain unintegrated; this checkpoint does not assume their readiness.

## Checks and progress

Targeted reviewed worker scope: 25 tests passed. Full frontend checkpoint: 68 unit tests passed. All 8 browser E2E tests passed, including the A01/P07 wiring and independent C06 clipboard addition. Native root: 10 tests and strict clippy passed. Image core: 10 regression tests passed; debug macOS app bundle built.

The MVP acceptance score remains 43.75%: clipboard writing is implemented, but the combined native pin/clipboard-controls gate is still incomplete; capture still lacks actual permission/mode GUI acceptance. No gate was weakened or silently split to raise the score. Current progress notes were refreshed while retaining the same milestone baseline. Real screen capture, clipboard paste and native dialog acceptance remain NOT EXECUTED.
