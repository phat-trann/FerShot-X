# Development

Use the repository’s `.nvmrc` (Node 26.13.0) and the existing Rust toolchain. Do not change global Node defaults.

```sh
npm ci
npm run version:check
npm run tauri dev
```

Safe automated checks use injected native APIs and synthetic image data:

```sh
npm run typecheck
npm run test:unit
npm run test:e2e
```

Build only when packaging is intended:

```sh
npm run build
cargo test --manifest-path src-tauri/Cargo.toml --lib --offline
npm run tauri build -- --bundles app
```

`package.json` is the version source. After an intentional version change, run `npm run version:sync`; `npm run version:check` checks renderer, native and lockfile metadata and the README heading. Keep versions unchanged while a candidate awaits acceptance. Patches fix existing behavior; minor versions add compatible features.

Commit and push require explicit user acceptance. An increased stable version pushed to `main` triggers the existing signed macOS release workflow. Ordinary pushes without a version increase skip release creation. Preserve the updater public key and configured app-signing identity. See [release configuration](releases/UPDATES.md) for user-managed secrets and signing setup.

Never commit credentials, signing private keys, captures, generated evidence or build output. Native capture, notification, multi-display and real signed-update checks remain distinct from injected browser tests. Historical research and immutable review packets preserve their original provenance.
