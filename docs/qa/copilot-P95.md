# P95 model compatibility and persistence regressions

Eight public codec regressions pass: owned basic/advanced data; duplicate IDs; schema/geometry/graph bounds and strict undefined rejection; plus blank ID/color, zero/negative width, invalid/exhausted counters and advanced contract style rejection on encode/decode. MAX_SAFE_INTEGER-1 round-trips for a basic counter. Producer changes were separately claimed as P73 after Codex's functional correction request.

Command: Node 26 `vitest run src/testing/copilot-editor-session-codec.test.ts` — 1 file, 8 tests passed. No renderer or OS actions. Build/integration delegated to Codex; no Shottr storage/runtime equivalence inferred.
