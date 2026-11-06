# P71 print scale control correction

Added an explicit controlled Print scale selector for the existing fit/actual state. It is disabled while busy or canPrint is false, preserves the current callback props, emits no print on selection and reuses existing layout semantics. The label explains that oversized images still fit the sheet under the existing actual mode. No A30 producer or native source changed.

Node 26 `vitest run src/testing/copilot-local-output-workspace.test.tsx` — 1 file, 6 tests passed under separate P96 claim, including actual-size callback and disabled control cases. README updated. Build/integration delegated to Codex; no printing/drag/OS action or original parity acceptance inferred.
