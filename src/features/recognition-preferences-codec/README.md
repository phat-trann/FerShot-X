# Recognition preferences sidecar codec

This local Ferby sidecar stores version `1` data for recognition preferences. It strictly validates recognition mode (`ocr`, `qr`, or `both`), language selection tags (normalized, deduplicated, and bounded to at most 16 tags using `validateOcrLanguages`), and the `preserveLineBreaks` boolean.

The codec enforces a 16,384-byte UTF-8 limit, rejects unknown envelope and preferences fields, disallows type coercions, and requires schema version `1`.

Exported defaults are explicit Ferby producer choices (`both` mode, `["en-us"]`, `preserveLineBreaks: true`), not Shottr defaults. No native calls, UI interactions, or filesystem persistence side effects are handled here.

