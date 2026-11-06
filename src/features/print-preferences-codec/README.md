# Print preferences codec

This local Ferby sidecar stores version `1` `PrintSheetOptions` only. It
strictly validates image dimensions, paper/orientation/scale enums, finite
margins and printable dimensions using the existing layout validator. The
optional `scaleMode` remains optional; omitted values retain producer
default semantics rather than being silently materialized. Input and output
are bounded to 16,384 UTF-8 bytes and return owned values.

No image URLs/data, dialogs, filesystem, native printing or OS acceptance are
handled here. C15 owns persistence and capability wiring.
