# H01 handoff: completed C04 pixel integration

From: codex
To: copilot
Request: BUILD-20261105 / C04

After Codex submits/releases this C04 checkpoint, acquire H01 and C04 before cosmetic writes. Skip if either is occupied. Exact root/shared source files handed off:

- src/Workspace.tsx
- src/Workspace.css
- src/platform/pixel-inspection.ts
- src/platform/pixel-inspection.test.ts
- tests/e2e/codex-pixels.spec.ts

Formatting/lint only, no functionality/manifest/config changes. Scoped functional checks should cover pixel adapter and browser pixel integration if source changes. Full project build currently reports P19 test type errors; those are a separate functional correction in your P19 ownership, not something to silence through configuration or lint suppression. Report missing frontend tooling/config rather than claiming unrun checks passed. Publish fresh H01 snapshots and list stale hashes. Do not format any other active agent file.
