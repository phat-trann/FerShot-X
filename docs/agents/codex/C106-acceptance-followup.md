# C106 local passwords and capture polish

User transferred stopped C106/root-wiring claims. Recorded USER_REPORTED zoom/tray/scroll passes; permissions work, while Keychain prompts and faint old-image pixels remain. Update notice waits for the next release; acceptance stays 85%.

Replaced runtime Keychain access with native-only bounded atomic plaintext credentials (0600). Users re-enter FTP/HTTP passwords once; existing entries are untouched. Capture masks/clears prior pixels, invalidates pending presentations, and restores cancellation. Reduced Fastest/Fast settle delays; added tool/drag/loading/control cursors.

Retired ftp_keychain.rs is byte-verified in ignored tmp/retired-C106; SHA-256 e294cf9d699099b06439eda89de70d4dd6edb35808ed870dcc5c8504a4fa5c9e. No real secrets, OS input/capture, server calls or update installation occurred. Existing updater/app signing configuration is preserved. Real flash, credentials, scroll speed and updater retests remain required. Patch: 1.1.7. Passed: TypeScript, 441 unit, 75 native, 71 browser tests and warning-free native production compilation. Formatting/lint not run.
