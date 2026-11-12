# C96 manual updater setup guide

Clarified user-owned GitHub, real updater keypair and Apple Developer ID/notarization configuration, including public-release-only repositories for private source. Rechecked the actual release workflow, generated-overlay script and installed signer CLI help. No keys or credentials were generated, read or uploaded. No source functionality changed; no additional tests/builds/server operations were needed.

The current local 1.1.0 package remains unconfigured and ad-hoc. A configured signed bootstrap must be installed once before later releases can update in-app. Explain each environment variable/secret, required public assets, daily scheduling, and the final real-version upgrade test. Existing phase-2 acceptance remains 85% before/after. Release commit/tag/push stays gated on actual accepted candidate and signing setup.

References: docs/releases/UPDATES.md; official Tauri macOS signing, Apple CSR/Developer ID/app-specific-password and GitHub environment documentation.
