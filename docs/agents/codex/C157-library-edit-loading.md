# C157 Library Edit loading

Local double-click and the Edit action show immediate icon-only opening indicators on the originating row/button and a preview overlay. Existing selection and FTP double-click browser behavior remain intact. Opening does not depend on preview decode completion.

A transient UUID follows native inbox, document and presentation state. Native show_editor reports the matching result after attempting foreground presentation, so enqueue completion does not prematurely hide the spinner. Block duplicate requests; clear loading on read/presentation errors for retry. A 30-second missing-result fallback reports delay without claiming cancellation. Tokens are bounded and excluded from draft storage/logs. Reduced motion is respected.

Validation: TypeScript, two UI guards and ten injected browser cases pass, including actual popup request-token round trip, delayed loading, duplicate suppression, wrong-token isolation, errors, timeout and Library/inbox regressions. Whitespace passes. Native changes source-reviewed only; no build, real OS/server actions or publication. Installed acceptance pending.
