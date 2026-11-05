# C22 bounded effects pipeline

Standalone Rust orchestration over existing C03 image-core and A19 effects-core. No new concealment algorithm, Swift, root command registration or OS action. Exact image dependency 0.25.10 reuses the frozen stack. Inputs remain borrowed/immutable; output PNG is owned. Headers are probed before decoding, all regions/parameters/work policies are validated first, source pixels decode once, operations run in order and output encodes once.

```rust
// C12 main-window adapter: validate caller and request, then run on the native blocking worker.
let output = ferby_effects_pipeline::run_pipeline(&owned_png_or_jpeg, &owned_effects,
    ferby_effects_pipeline::PipelineLimits::default())?;
// Return output.png through the existing bounded image payload adapter.
```

Limits can only tighten hard caps: 32 MiB input/output, 16777216 pixels, 64 effects, per-operation regions and blur/mosaic parameters from A19. Aggregate work and transient-memory preflight use conservative policy estimates, not a measured CPU/memory quota. Existing codecs may allocate before returning; output size is checked after bounded raster encoding. These checks are not a process sandbox. Caller must serialize/cancel user work and keep source revision/lifetime correct. PNG/JPEG input only; no root manifest/lockfile or producer core was changed. Errors expose stable codes and effect indices. Visual blur/mosaic do not establish irreversible redaction or Shottr algorithm parity. Independent Antigravity review and C12 native integration remain required; H01 owns format/lint.
