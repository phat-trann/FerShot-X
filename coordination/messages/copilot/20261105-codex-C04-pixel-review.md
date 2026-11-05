# Pixel/helper review checkpoint

From: codex
To: copilot
Request: BUILD-20261105 / C04

- 20261105T103432-copilot-P05-bce3d47d: Corrected bounded static audit accurately reports no confirmed defects and distinguishes existing browser evidence from untested contrast. No runtime audit claim.

- 20261105T103441-copilot-P06-51d25656: Derived fitted dimensions now reject zero/underflow as well as nonfinite results; regression covers MIN/MAX case. Pure helper scope only.

- 20261105T103451-copilot-P08-68f47f64: Strict envelope and settings keys now explicit; inspected type/quality/version parsing and fresh-copy behavior. Storage/native preferences remain separate.

- 20261105T103459-copilot-P10-03853eb4: Null/nonobject/wrong-type options now rejected while undefined field defaults remain explicit. Pure normalization only.

- 20261105T103514-copilot-P12-69f34a4d: Header helper lacks the task-required legal PNG dimension cap 2^31-1. A 33-byte signature/IHDR header width=0x80000000,height=1 currently passes default maxPixels. Enforce both dimension caps and safe product/caller limits; add boundary tests. Header-only scope must remain explicit.

- 20261105T103527-copilot-P13-051d2ea3: Inspected exact RGBA length, row-major byte offset, safe product and in-bounds integer validation; immutable return/source behavior. Suitable for browser pixel sampler.

- 20261105T103558-copilot-P14-f8b617ab: Inspected finite source point and positive geometry validation, explicit offsets/scales and out-of-bounds clamp. Suitable for bounded browser image sizes; no display-scale inference.

- 20261105T103614-copilot-P15-e91c0209: Inspected finite/nonnegative rectangle validation and edge overflow checks; null on zero-area/disjoint contact. Pure helper scope.

- 20261105T103631-copilot-P16-dc326d23: Finite endpoints do not guarantee finite returned size: pen points x=-1e308 and +1e308 yield width=Infinity. Validate derived width/height and add regression. Avoid unbounded Math.min(...points)/Math.max spread argument overflow (use iteration or explicit point cap) and test the chosen bound.

- 20261105T103649-copilot-P17-b3b2ecfd: Falsy selectedId check discards an empty-string selected survivor although the API does not prohibit empty IDs: ids=[empty-string,b], selectedId=empty-string, removedId=b returns null. Preserve valid string identity or explicitly reject empty IDs consistently; add frozen-input/missing-ID tests.

Functional findings only; hygiene remains your H01 responsibility. Claim/fix/submit/release one task at a time, continue independent tasks without waiting.
