# Capture preferences codec

This local FerShot format uses a version `1` envelope containing the five
`PostCapturePreferences` booleans. Parsing and serialization strictly require
booleans and enforce a 16,384-byte UTF-8 limit; no truthy-string coercion or
I/O is performed. Results are owned and immutable.

The legacy adapter starts with the existing post-capture defaults and maps
`AppSettings.showPreview` to `showPreview`, unless an explicit boolean override
is supplied. This is a FerShot default/adapter choice, not an observation of
reference application behavior. Future C10 persistence wiring remains caller-owned.
