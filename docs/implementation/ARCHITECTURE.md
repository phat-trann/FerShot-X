# Ferby Shottr implementation architecture

The user selected **Tauri 2 + Rust**. The frontend is React + TypeScript + Vite. macOS is the first native target. This decision supersedes earlier investigation-only scope; the Shottr evidence remains reference material, not a guarantee that its unknown behavior can be reproduced.

## Current runnable baseline

- `src/Workspace.tsx`: import one or more local PNG/JPEG/WebP/GIF files, select an image, zoom/fit and close it. Documents are session-only and object URLs are revoked on close.
- `src/platform/import-image.ts`: bounded file size, browser decoding, dimensions and decode-error cleanup.
- `src/platform/native.ts` and `src-tauri/src/commands.rs`: typed `app_info` IPC boundary. No general-purpose shell/filesystem plugin is exposed.
- `src-tauri/`: native Tauri executable and macOS application bundle configuration. `src-tauri/Cargo.lock` and `package-lock.json` are tracked.
- `src/contracts/`: shared, frozen TypeScript types. Read the relevant file, not the entire research inventory.
- `tests/e2e/`: browser-side import/zoom/close/error tests with generated, non-sensitive PNG bytes. These do not establish native screen-capture permissions or every WKWebView behavior.

Screen capture, OCR, drawing, export and persistent storage are future queue work. Do not display controls that pretend those operations already work.

## Ownership and integration seams

| Area | Owner | Rule |
| --- | --- | --- |
| `src/contracts/**`, `src/Workspace.*`, `src/App.tsx`, `src/main.tsx`, `src/platform/**` | Codex integrator | Stable contract and application wiring |
| `src-tauri/src/**`, `src-tauri/Cargo.toml`, root configs/manifests/lockfiles | Codex integrator | Native command registration, capabilities and dependencies |
| `src/features/editor/model/**` | Codex C01 | Pure annotation state/history; no rendering dependencies |
| `src-tauri/crates/capture-core/**` | Codex C02 | Standalone Rust crate; no shared root manifest edits |
| `src-tauri/crates/image-core/**` | Codex C03 | Standalone crop/resize/encode crate |
| `src/features/capture/**` | Antigravity A01 | Props-driven capture UI |
| `src/features/library/**` | Antigravity A02 | Props-driven session library UI |
| `src/features/settings/**` | Antigravity A03 | Controlled Ferby settings UI |
| `src/features/editor/view/**` | Antigravity A04 | Editor pointer/rendering view using frozen contract |
| `src/features/pin/**` | Antigravity A05 | Pin/preview presentation; no native window wiring |
| `src/features/color/**` | Copilot P01 | Small pure color utilities |
| `src/features/measurement/**` | Copilot P02 | Small pure coordinate utilities |
| `src/features/shortcuts/**` | Copilot P03 | Descriptor/matching helpers; no global registration |
| `src/features/export/names.*` and matching tests | Copilot P04 | Filename/extension helpers |
| `docs/qa/copilot-P05.md` | Copilot P05 | Bounded baseline accessibility/UX audit |

Workers may create their own feature-scoped CSS/tests. Scope selectors under their component root; do not modify global tokens or root CSS. Components use callbacks and fixtures until integrated; importing them in the application shell is Codex's job. Unwired components must not be called shipped features.

## Frozen frontend contracts

- `media.ts`: session image metadata, capture mode, CapturePanelProps, LibraryPanelProps.
- `editor.ts`: image-pixel Point/Rect, tool names, annotations/styles and EditorViewProps. Coordinates use top-left origin in source-image pixels, independent of CSS zoom.
- `settings.ts`: Ferby's own settings model and SettingsPanelProps. These are design choices, not recovered Shottr defaults.

Do not change shared contracts to unblock yourself. Record a proposal in your completion packet, then continue another independent task. Codex decides compatibility and integration. A style change must preserve accessible names and keyboard access.

## Native capture and image processing

C02/C03 create independent Rust libraries in their owned directories. They can use their own dependencies/Cargo.lock; they must not edit the application Cargo.toml or register Tauri commands. C04 integrates reviewed outputs through typed commands.

For macOS capture, a fixed `/usr/sbin/screencapture` invocation is a permitted first implementation choice. Spawn it without a shell, restrict mode arguments and generate output paths internally. Distinguish user cancellation, permission denial and process failure. Do not actually capture the user's screen in automated tests; inject a fake runner and test command construction/cleanup. Unsupported hosts must return a clear unsupported result. This is a Ferby design choice, not proof of Shottr's implementation.

Image transforms use explicit bounds, decode limits and non-overwriting output behavior. Test with synthetic images. Do not copy proprietary resources/code into this project. No cloud, telemetry, license service or Shottr user-data migration is part of the initial build queue.

## Checks and tooling

Use Node selected by `.nvmrc` and Rust stable through `source "$HOME/.cargo/env"`. No global Node default needs changing.

```sh
rtk proxy npm run build
rtk proxy npm run test:unit -- src/features/<owned-scope>
rtk proxy cargo test --manifest-path src-tauri/Cargo.toml --lib
rtk proxy cargo test --manifest-path src-tauri/crates/<owned-crate>/Cargo.toml
rtk proxy python3 -m unittest discover -s scripts -p test_review_queue.py -v
```

Run checks relevant to your changes; a not-yet-created Vitest scope has no tests and must not be reported as passed. Another agent's unfinished file can break a global check: record the exact failure and leave their code alone. Submit your own result and move to the next independent scope.

See [the build queue](../../coordination/BUILD-QUEUE.md) and [completion protocol](../../coordination/reviews/README.md).
