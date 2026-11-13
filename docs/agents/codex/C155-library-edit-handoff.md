# C155 Library/Edit handoff

User reports intermittent failure in both Local and FTP. Existing installed diagnostics contain FTP library_image failures on 1.2.2, but no direct evidence establishing the Edit failure’s cause. No credentials, images or server operations were accessed.

A startup race exists between initial inbox drain and asynchronous event subscription. Re-drain after subscription, keep pending work behind the live busy guard and report listener failures. Add bounded operation/duration diagnostics for inbox, sizing, presentation and image decoding; keep renderer/native allowlists aligned and log no identifiers or payloads.

Validation: TypeScript, four diagnostic unit tests and three injected browser cases pass. Cases cover arrivals before listener registration, queued arrivals during a busy operation and failed presentation logging without filename leakage. Whitespace/allowlist checks pass. Native allowlist reviewed only; no native compile/build or publication. Real intermittent failure remains pending installed retest.
