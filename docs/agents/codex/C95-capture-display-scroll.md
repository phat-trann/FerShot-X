# C95 capture display and scroll repair

Acceptance: 85% → 85%; native retest pending.

Capture and Library handoffs defer Edit presentation until the matching Konva image is painted and native sizing completes. Focus/visibility restoration redraws retained pixels. Mouse-wheel classification expires across rerenders; trackpad pan/pinch remains. Existing image-sized Edit, 80% Library and cloud-upload menu changes are preserved.

Allowlisted local logs showed permission failures, no movement and recent stitch-stage failures with multiple frames. Capture-specific registration excludes narrow scrollbar edges, tolerates small pixel changes and retains common fixed header/footer once. Strict generic stitching is unchanged. Significant animation/no overlap still fails explicitly.

Checks: 439 unit tests; 60 browser cases; final targeted renderer regression; TypeScript and version consistency passed. New Rust registration/restoration tests are written but NOT RUN. No native compile/build, real capture, permission/server actions, formatting/lint or release publication. Recheck N01–N07 in the release manual matrix.
