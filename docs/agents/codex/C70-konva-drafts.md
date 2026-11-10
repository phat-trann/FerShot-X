# C70 Konva and resumable Local drafts

Restored the uploader symbol inside a macOS tile. Lucide tray glyph geometry is 80%, with stroke 2.8 instead of 1.4. Active drawing/selection, region tools and composition use React Konva. Pointer motion updates canvas nodes; document/history commits happen at gesture end. Crop/Resize/Blur still require Enter. Search is removed.

Local uses a stable image identity across raster derivatives, preserves editable vectors, and saves private draft sidecars. Copy/Save export separately. Reopen restores elements; stale raster/draft checksums report an error without deleting data. Only changed raster sources are re-encoded; older open derivatives cannot overwrite the latest draft. FTP policy is unchanged.

Validation: 411 unit tests, 14 injected browser cases, no-emit typecheck and version check passed. Native draft tests were added but NOT RUN. The earlier build stopped; no build, native compilation or release publication follows the user's correction. Phase-2 acceptance: 55% → 55%. USER_WAIVED_REVIEW; formatting/lint not run.
