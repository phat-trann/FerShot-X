# C96 official updater bootstrap

Acceptance: 85% → 85%; signed/native/server acceptance pending.

Implemented official updater/process plugins, main-only resource ownership, Settings/tray controls, persistent daily checks, progress/status, draft flush, duplicate suppression and FTP/native-operation install guards. Startup uses monitor-cog with a trailing tick. GitHub Actions builds signed/notarized universal artifacts and latest.json; publication verifies manifest destinations and actual signatures. Real keys remain user configuration; none were invented.

Checks: 446 unit tests, 61 browser cases, 61 native tests, 10 scroll-core tests; final seven updater tests; TypeScript/version checks, release-script negative checks and workflow YAML parse passed. Final arm64 app build passed. Initial local bundle verification failed; ad-hoc re-signing repaired it and strict verification passed. No real captures/FTP, signed-update installation, GitHub execution/publication or formatting/lint.

Local ZIP is unconfigured, ad-hoc only, not notarized. Setup: docs/releases/UPDATES.md.
