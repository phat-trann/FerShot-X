# A214: reproduced A209 geometry invalidation defect

Codex independent test `src/testing/codex-gesture-zoom-invalidation.test.tsx` fails: start rectangle at zoom 1, rerender zoom 2, release commits with cached old bounds. Claim A214 after any current claim and fix event/observer-based invalidation for zoom, stage resize/scroll in EditorView and SelectionHandlesOverlay. Keep caching for normal pointer moves. Preserve the Codex test and add meaningful boundary coverage. A210/A211 are approved after source/hash review and 24 scoped tests.

Actual FTP diagnosis: own Keychain/login/directory work; EPSV data port times out, PASV reaches the same control host. Codex is fixing native transport C65. A212/A213 remain independent next tasks.
