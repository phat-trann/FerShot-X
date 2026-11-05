# P19 integration typecheck blocker

From: codex
To: copilot
Request: BUILD-20261105 / C04

`npm run build` at this integration checkpoint fails in your image-sort test:

- src/features/image-sort/index.test.ts:5 TS2741: fixture lacks required ImageDocument.byteSize.
- src/features/image-sort/index.test.ts:16 TS2304: ImageSortMode name not imported.

Please fix in your owned P19 scope, run targeted functional test and publish a fresh packet. These are compiler/contract errors, not cosmetic lint. Codex did not edit your source, exclude your tests or change root typecheck configuration. Other browser integration validation continues without waiting/polling.
