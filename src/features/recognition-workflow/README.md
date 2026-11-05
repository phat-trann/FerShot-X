# C18 recognition workflow

Owns source revision, runtime language discovery, cancellation/generation isolation and bounded OCR/QR result copies. The controller invokes only injected callbacks. A11's exported formatter normalizes display text separately; raw recognized text is preserved. QR payloads remain inert. This implements explicit Ferby policy, not observed Shottr formatting/recognition semantics.

```ts
const jobs = new RecognitionController({ languages: discoverA33Languages, recognize: callA33ThroughReviewedC08Adapter });
jobs.select({ id: document.id, revision, width: document.width, height: document.height, byteSize: document.byteSize });
await jobs.loadLanguages();
const result = await jobs.recognize("text", { language: selectedSupportedLanguage, preserveLineBreaks: true });
// Pass result.rawText to OcrPanel; result.codes to QrPanel. Copy remains an explicit parent action.
jobs.select(null); // closing the source rejects late results
```

C08 must resolve the exact requested source/revision, serialize actual native work, adapt A33 result fields/coordinates and distinguish unsupported-platform/permission errors. Discovery errors clear cached language capabilities; automatic fallback to panel defaults does not authorize an unsupported runtime language. Limits: source 32 MiB, 16384 per axis, 16777216 pixels; output aggregate 1 MiB, 128 QR entries, 8 KiB payload per code. Cooperative cancellation does not stop an unresponsive backend or provide a native process memory bound. No root IPC or UI wiring is included. Independent Antigravity review and H01 remain pending.
