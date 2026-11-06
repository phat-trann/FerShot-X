# P91 portable archive regressions

Six public codec regressions pass: exact byte/Unicode/selection/annotation round trip and owned copies; unsupported version/extra fields; image dimension/pixel bounds; duplicate IDs/invalid selection; malformed base64/annotation version; and explicit separation of container decoding from later browser raster decoding. Only the two named inputs were read. No producer code changed and no file dialog, browser raster acquisition or OS action ran.

Command: Node 26 `vitest run src/testing/copilot-portable-archive.test.ts` — 1 file, 6 tests passed. No functional defect found in covered cases. Full product build/integration remains Codex-owned; no native or Shottr parity acceptance inferred.
