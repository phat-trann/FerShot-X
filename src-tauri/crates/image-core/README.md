# Image transform core

`Raster::decode` accepts PNG/JPEG bytes with an encoded limit of 32 MiB, maximum dimension 16384 and maximum 16777216 pixels. It checks dimensions before full decoding and configures image crate decoder limits. `max_alloc` is a best-effort decoder budget, not a strict cap on the application's total memory.

`crop(CropRect)` is non-destructive and rejects zero, out-of-range and overflowing bounds. `resize(max_width, max_height)` fits within a positive box with aspect-preserving integer dimensions and Lanczos3 resampling; it permits upscaling and rounds down, clamping each result dimension to at least one pixel.

`encode(Png)` preserves alpha. `encode(Jpeg { quality })` accepts quality 1–100 and composites alpha over white. `save_new` writes through a temporary sibling and never clobbers an existing destination; it does not promise universal filesystem atomicity or crash durability of the parent directory. No source file is modified.

The crate has no Tauri/UI dependencies and performs no capture. Browser-only import formats (WebP/GIF) need rasterizing to PNG before native transforms; animated export is not implemented.

APIs checked against primary documentation: [ImageReader](https://docs.rs/image/0.25.10/image/struct.ImageReader.html), [Limits](https://docs.rs/image/0.25.10/image/struct.Limits.html), [JPEG encoder](https://docs.rs/image/0.25.10/image/codecs/jpeg/struct.JpegEncoder.html), [persist_noclobber](https://docs.rs/tempfile/latest/tempfile/struct.NamedTempFile.html#method.persist_noclobber).
