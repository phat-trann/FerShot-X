# C140 Performance cleanup and user guide

TypeScript dependency traversal covered 321 source/test files and resolved static, dynamic and type imports. Twelve disconnected legacy UI packages and their exclusive tests were removed: 51 files, 167,934 bytes. SHA-256 manifest: C140-retired-files.json; byte-verified local archive: artifacts/retired-source/C140. Original author/review evidence remains untouched. Test-only reusable helpers and current export/render paths remain preserved.

Library coalesces overlapping refresh requests, awaits trailing data, skips hidden periodic polling and refreshes on visibility. Thumbnails memoize their displayed identity. A browser regression proves forty update events during one blocked read produce one trailing read while preserving preview/selection. This is an IO-count result, not an installed-app speed benchmark.

README now documents user workflows, privacy, installation and updates; developer commands moved to docs/DEVELOPMENT.md. Four screenshot requests are listed.

Validation: TypeScript, 410 existing unit cases plus both refresh cases, eleven browser cases, version/link/whitespace checks pass. No build or publication; acceptance pending.
