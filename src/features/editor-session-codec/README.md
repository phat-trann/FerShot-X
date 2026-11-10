# Editor session codec

This local FerShot format stores version `1` envelopes with `basic` frozen
`Annotation[]` data and lossless `advanced` `AdvancedEditorItem[]` data.
It does not store image sources, object URLs, files or native state; callers
provide image dimensions for validation.

The codec rejects unsupported versions, malformed required fields, duplicate
IDs, non-finite or out-of-bounds geometry, cycles and non-JSON values. Limits
are 4 MiB UTF-8, 1,000 items, depth 32 and 20,000 graph nodes. Decoding and
encoding return owned data; this is a FerShot archive boundary, not a claim about
reference application storage.
