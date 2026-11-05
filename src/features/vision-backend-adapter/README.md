# Injected Vision backend adapter (C23)

`createVisionBackendAdapter(ports, maxResults = 50)` implements C18's `RecognitionBackend`. Ports are `resolve(source, signal)`, `languages(signal)` and `recognize(request, signal)`. The resolver returns `{source, bytes: Uint8Array, release()}` for the exact source ID, revision, dimensions and encoded byte size. A valid returned lease is released once after success, failure or late cancellation. Original bytes are copied before transport. The signal is checked before and after awaited work; ports must settle their promises and honor cancellation where possible. Synchronous native execution cannot be interrupted by this adapter.

The local request follows A33 camelCase fields but carries a `Uint8Array`; future **C08 root wiring must explicitly serialize it to Rust `Vec<u8>`**, bind source identities to trusted session records, authorize main-window IPC and offload native work. No command currently registered by this module is implied. Request/image format decoding remains A33's responsibility; the adapter validates metadata and byte budgets.

Unknown responses require schema 1, matching dimensions/languages, consistent text blocks/summary and bounded counts/UTF-8. The adapter uses the intersection of A33 and C18 budgets (128 results; QR payload 8192 bytes; symbology 128 bytes). Languages use the common hyphen syntax; underscore aliases require an explicit later policy. Line breaks are preserved for C18 to format. QR IDs are deterministic revision/ordinal identifiers local to a result under its selected source, not global document identifiers. Ports must bind the request to their corresponding response; A33 responses have no source ID or revision to independently authenticate.

```ts
const backend = createVisionBackendAdapter({
  resolve: sessionBytesForExactRevision,
  languages: injectedLanguageQuery,
  recognize: injectedVisionTransport,
});
const controller = new RecognitionController(backend);
// Select an explicit user-requested source, load languages, then call recognize.
```

There is no Tauri import, OS action, cloud, clipboard or filesystem implementation. Synthetic port tests do not establish native OCR accuracy or original Shottr parity.
