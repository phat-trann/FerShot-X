# Ferby Shottr

A local screenshot/image workspace built with **Tauri 2 + Rust + React/TypeScript**. macOS is the first native target. Shottr 1.9.3 was investigated as a feature reference; its evidence and limitations are preserved separately from Ferby implementation choices.

## What works now

The foundation imports local PNG/JPEG/WebP/GIF images, keeps a session-only image list, previews dimensions, zooms/fits and closes images, and handles invalid files. A typed native `app_info` command connects the frontend to Rust. No image is uploaded.

Capture, drawing, OCR, export and persistent library features are assigned in the build queue; they are not implemented by the foundation. The current app bundle is a local development build, not a signed/notarized release.

## Start development

From this directory:

```sh
rtk proxy zsh -lc 'source "$HOME/.nvm/nvm.sh"; nvm use 26.13.0; source "$HOME/.cargo/env"; npm run tauri dev'
```

Node 26.13.0, Rust stable 1.99.1/Cargo, rustfmt/clippy and project npm dependencies were installed/verified for this request. Existing Xcode Command Line Tools provide the macOS compiler. The global Node 8 default and shell profile files were preserved. On another machine, use the [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), then install dependencies with the project's lockfiles.

Build a local macOS application:

```sh
rtk proxy zsh -lc 'source "$HOME/.nvm/nvm.sh"; nvm use 26.13.0; source "$HOME/.cargo/env"; npm run tauri build -- --debug --bundles app'
```

Output: `src-tauri/target/debug/bundle/macos/Ferby Shottr.app`. It was built successfully on this Mac; no installation into `/Applications` or distribution was performed.

## Parallel agents and mandatory summaries

- [Copyable kickoff prompts](coordination/START-HERE.md): one queue per client.
- [Build queue](coordination/BUILD-QUEUE.md): 15 prompts, separate ownership and independent work.
- [Architecture/contracts](docs/implementation/ARCHITECTURE.md): integration seams and validation commands.
- [One review inbox](coordination/reviews/INDEX.md): completion packets plus historical handoffs for Codex.
- [Completion protocol](coordination/reviews/README.md): required after EVERY agent request/task, including partial or blocked work.

Codex owns the largest domain/native/integration scope; Antigravity builds medium-sized presentation modules; Copilot handles small utility/test pairs. Agents submit independent immutable packets and continue the next owned task without waiting for review. Only Codex edits root wiring, shared contracts and review decisions. Files do not automatically launch or notify another client.

## Validation

```sh
rtk proxy npm run build
rtk proxy npm run test:e2e
rtk proxy cargo test --manifest-path src-tauri/Cargo.toml --lib
rtk proxy cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
rtk proxy python3 -m unittest discover -s scripts -p test_review_queue.py -v
```

Select the Node/Cargo environment as above before commands. E2E tests use installed macOS Chrome when available, otherwise Playwright Chromium; set `FERBY_CHROME_PATH` to an existing executable or install Chromium with `rtk proxy npx playwright install chromium`. `npm run test:unit -- <owned-scope>` runs future feature-specific Vitest tests; no feature test should be reported as passing before it exists.

See [foundation validation](docs/implementation/VALIDATION.md) for actual checks and limitations. Browser tests do not prove every WKWebView/native behavior. Screen Recording/Accessibility permission for the REA host was denied during target research; no OS privacy settings were changed by installing development tools.

## Preserved investigation

- [Phase 1 feature map](docs/phase-1-features.md), [integration review](docs/integration-review.md) and [decoded UI inventory](docs/ui-inventory.md).
- `evidence/target.json`: Shottr target version/build and executable SHA-256.
- `evidence/ui-signals.json`, `evidence/native-summary.json`, `evidence/agents/`: curated REA-derived observations and Codex task projections.
- `evidence/raw/`: complete local records, Git-ignored; retained IDs are not transferable between independent MCP sessions without portable records.

Research collection/projection scripts remain available under `scripts/`. Do not recollect over another agent's evidence or treat a static label/import as tested behavior.

Git remains on `main` with the existing INIT commit. No new commit, staging or remote change was performed for this request. `.vscode/`, captures, raw evidence, application copies, node_modules, Rust target directories and build/test output remain ignored; source and lockfiles are reviewable.
