# C97 configured ad-hoc updater bootstrap

Acceptance: 85% → 85%; live upgrade/native/server acceptance pending.

Removed Developer ID/notarization requirements from CI; app signing is ad-hoc, updater signatures remain mandatory. Validated and pinned the user's existing public key; private key/password were never read, printed or copied. Overlay generation falls back to the pinned key and rejects differing overrides. Updated current setup instructions to the two GitHub secrets.

Checks: five configuration tests passed, including tampered-key rejection; overlay continuity, workflow YAML/Apple-credential absence, Python compilation and version checks passed. TypeScript/Vite/native release app build passed. Strict ad-hoc codesign verification passed; binary contains the configured public key and endpoint. ZIP: artifacts/releases/FerShot-X-1.1.0-macos-bootstrap.zip.

No real capture, FTP, signed update installation, GitHub publication, key generation or formatting/lint. The previous unconfigured archive and historical C96 reports remain preserved. GitHub secrets and manual acceptance are still required.
