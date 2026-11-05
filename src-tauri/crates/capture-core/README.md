# Native capture core

`capture(CaptureMode)` runs a fixed `/usr/sbin/screencapture` executable on macOS without a shell. Fullscreen means the main display (`-m`); area/window modes are interactive (`-i -s` / `-i -w`). Arguments were checked against the locally installed command's usage output. The library never requests clipboard, video, Mail, Preview or settings-driven output.

`CapturedFile` owns a private, randomly named temporary directory. Read/decode its PNG while the owner lives; dropping it removes the directory. Errors also clean up output. `read()` limits file size, rejects symlinks/non-regular output and checks the PNG signature; callers must still fully decode the image with bounded decoding before presenting it.

Only invoke production capture after a user capture action. Keep it off the UI thread and restore any hidden application window on every result. Inject `CommandRunner` for tests; no test invokes real screen capture.

Permission classification requires explicit denial text. Generic display failures stay ProcessFailure. Interactive missing-file success, or exit 1 with no diagnostic, is treated as cancellation; this is a documented heuristic, not a complete macOS exit-code contract. Cancellation, permission and display behavior still need authorized native UI testing. Unsupported hosts return UnsupportedPlatform before any command runs.
