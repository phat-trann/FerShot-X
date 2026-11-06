# Pixel effects panel

This controlled panel emits a validated local `PixelEffectRequest` only when
the user presses Apply. Blur and mosaic are visual effects, not irreversible
cryptographic redaction; solid cover and transparent erase overwrite the
selected pixels. Regions use image-pixel coordinates and are bounded to the
existing 4,194,304-pixel effect cap. The panel performs no raster work, I/O,
native operation or claim of a registered wire API; C12 maps the DTO to the
existing Rust effects pipeline.
