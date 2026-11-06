# C12 native pixel effects (UNREVIEWED)

Wired P76 region controls to the existing C22/A19 Rust effects pipeline through main-window-only typed IPC and the shared background job guard. Explicit Apply creates a new PNG from the current raster plus basic/advanced annotation layers; the original library image and editable history remain intact. Blur, mosaic, solid RGBA cover and transparent erase now enter normal library editing/copy/save/pin paths. Known capture scale is preserved for same-sized derived output.

Frontend and native validation enforce pixel geometry/parameters; the existing pipeline adds input/output, pixel, work and working-memory preflight limits. Requests currently apply one effect at a time; repeated applications remain explicit separate images. These are Ferby algorithms, not verified Shottr parity. Existing measurement integration remains; composition/backdrop/window appearance and automatic-adjustment root wiring are still open.

Scoped strict TypeScript and Rust compilation passed. Only local 0.1.0 effects crates were added to the locked stack; no existing package version changed. Existing unused-import warning in effects-core is delegated to Copilot H01. Tests/native acceptance deferred per user priority; no OS actions or formatting/lint executed. Independent review remains pending.
