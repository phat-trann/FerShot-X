# P96 local output capabilities and print scale

Six RTL regressions pass for explicit copy/save, independent print/drag capabilities, selected paper/orientation/fractional margins, busy/invalid-margin suppression and the new controlled actual-size selector. Scale changes emit no print; explicit Print passes scaleMode actual, and the selector disables while busy or printing unavailable. The producer control correction was separately claimed as P71.

Command: Node 26 `vitest run src/testing/copilot-local-output-workspace.test.tsx` — 1 file, 6 tests passed. No native print/drag/dialog/clipboard actions or source ownership changes. Build/integration delegated to Codex; runtime/Shottr parity is not inferred.
