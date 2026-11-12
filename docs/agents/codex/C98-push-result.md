# C98 completed source publication

Pushed to origin/main:

- f7da61e: reviewed 1.1.0 updater bootstrap, capture fixes and main-version release automation.
- 3ec05cd: supported macos-15 runner and same-unpublished-version retry after release-pipeline repairs.

Remote run 43155377005 passed version detection but cancelled on the retired macos-14 runner; run 43155733809 passed detection and release/tag guards, then entered version/test validation on macos-15. At this record's publication, release build/signing/publication remains in progress, not accepted.

Eight planner, eight mocked API/tag guard and five updater-configuration tests passed. Current version is 1.1.0; ordinary same-version source/docs pushes skip release. Real private keys, passwords, generated overlays and local ZIPs were excluded from commits. No force push or live capture/FTP/update installation occurred.

The user will manually verify the candidate and report issues before later version-bump update testing. Acceptance: 85% → 85%.
