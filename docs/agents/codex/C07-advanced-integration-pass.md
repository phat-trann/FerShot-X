# C07: Provisional advanced editor integration

Connected A34 advanced tools to the actual Workspace editor through a Basic/Advanced mode switch. Added image-scoped advanced item storage and a shared composite raster pipeline. Copy, save, pin, merge, crop/resize and measurement imprint now include basic plus advanced items; originals and editable item state are retained. Close removes root-owned advanced state. The advanced view includes basic annotations as its source preview and uses source-coordinate scaling; its component retains per-image undo/redo. Root output never coerces line/emphasis into the frozen basic Annotation contract.

This is source-ready UNREVIEWED development integration under the user's implementation-first priority, not independent approval or native/original parity acceptance. Basic-mode canvas does not currently display the separate advanced layer; the advanced view and output composite do. Broader target behavior and later validation may require corrections.

Scoped strict TypeScript compile for Workspace/editor/annotation renderer/A34 passed. No new functional suite or browser batch was run, deliberately deferred by user request. No real OS/native action, version bump or dependency addition occurred. Existing review/acceptance states remain pending. Formatting/lint deferred to Copilot H01.
