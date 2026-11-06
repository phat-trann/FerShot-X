# P93 recognition workspace lifecycle

Four injected UI/controller regressions pass. Actual RecognitionController instances use synthetic asynchronous backends; the child view and native copy/language ports are injected. Coverage verifies no recognition on render, duplicate start/copy suppression, revision-change invalidation, cancellation ignoring late output and prepare failure clearing busy with the actual error. No producer code changed.

Command: Node 26 `vitest run src/testing/copilot-workspace-recognition.test.tsx` — 1 file, 4 tests passed. Only the two named inputs were read. No engine, clipboard or capture operation ran; these checks do not prove real native OCR acceptance or Shottr parity. Build/integration delegated to Codex.
