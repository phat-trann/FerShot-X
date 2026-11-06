# C12 average region color integration

Connected the existing P32 bounded arithmetic RGBA helper to a browser raster adapter and the actual color-inspector UI. Users enter source-image rectangle coordinates, sample up to 1,000,000 pixels, and receive hex/RGBA with a swatch and rectangle identity. The temporary canvas contains only the requested region and is released after sampling. Original files and annotations remain unchanged; errors use the existing workspace operation handler.

Checks: TypeScript no-emit compilation passed. Tests: NOT RUN — deferred by user. Formatting/lint delegated to Copilot H01.

This explicitly implements Ferby arithmetic channel averaging of original pixels. Shottr weighting, alpha interpretation and text-color semantics remain UNKNOWN; no runtime parity claimed. USER_WAIVED_REVIEW; later overall review required. MVP acceptance remains 68.75%.
