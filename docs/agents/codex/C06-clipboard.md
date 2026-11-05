# C06: native image clipboard copy

Status: DONE for implementation/automated validation. Native paste acceptance: NOT EXECUTED.

## Product behavior

The workspace now exposes Copy image for the selected session document. An explicit click rasterizes the original image to PNG, invokes the typed `copy_image` command and reports success or an actionable error. Busy controls prevent overlapping capture/save/copy and accidental double submission. Failure releases the job so the user can retry; source images and session selection are preserved. Browser-only mode reports that the desktop app is required.

Copy includes the current raster only, not pending annotation overlays. No clipboard polling, read, clearing, background auto-copy or generic filesystem/shell command was added. Unsupported native platforms return an explicit error.

## Implementation and references

`copy_image` accepts only bounded encoded image bytes, rejects unknown fields, requires injected window label `main` and holds the shared job guard through blocking decode/write. Reuses C03 decoding and adds only an owned RGBA8 accessor, leaving source pixels immutable.

Uses macOS-only arboard 3.7.0 with image-data support. API choice: [Clipboard.set_image](https://docs.rs/arboard/latest/arboard/struct.Clipboard.html#method.set_image), [row-major RGBA ImageData](https://docs.rs/arboard/latest/arboard/struct.ImageData.html). Cargo.lock records exact resolution. The OS writer is injected behind `copy_with` so tests never instantiate the real clipboard.

## Actual validation

- Root Rust tests: 10 passed, including synthetic RGB/RGBA channel order, alpha preservation, invalid input never reaching the write boundary, typed errors and job release after failure.
- Image-core regression tests: 10 passed after the additive accessor.
- Platform adapter unit scope: 8 passed. Full frontend checkpoint: 68 tests across 17 files passed (includes concurrently delivered worker source; passing tests is not review approval).
- Browser E2E: all 8 passed, including 2 clipboard regressions with real canvas and fake IPC, retry/error/busy checks and source-image preservation. The remaining 6 cover the existing baseline/crop/save integration.
- Frontend production build and macOS debug application bundle passed. Strict root clippy passed.
- Real macOS clipboard read/write and external-app paste were deliberately not performed. The success UI was exercised with fake IPC; actual OS clipboard behavior remains a manual acceptance step. No capture or privacy setting changes.

## Independent work and coordination

This task was added because C04 initially had no fresh worker implementation available. It does not absorb A06-A10/P06-P11 or rebuild C01-C03/C05. During C06 validation fresh packets arrived; C04 reviewed nine and integrates only accepted A01/P07 in the separate checkpoint. Later file snapshots supersede earlier C03/C05 hashes where the additive accessor or adapter changed. Earlier packets remain immutable.
