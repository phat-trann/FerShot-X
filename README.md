# FerShot X 1.2.0

A macOS screenshot editor and explicit FTP publisher built with Tauri, Rust and React.

- **Capture:** screen, native area selection, repeat area, active/selected window, and automatic scrolling capture. Start from the menu bar. Scrolling capture selects a desktop region, collects overlapping frames and finishes on Escape or unchanged content, within image/memory limits.
- **Edit:** one compact React Konva toolbar and canvas for selection, shapes, arrows, pen, text/counters, emphasis, resize and editable blur, color, clipboard, local Save, FTP Upload. Image size opens compact resize presets/dimensions; Resize applies, while Escape or an outside click cancels. Blur is an editable, movable layer that preserves source pixels. Select is the initial default; drawing tools stay active after creation until changed or Escape is pressed. Area elements have eight resize handles and center dragging; lines/arrows use endpoint handles. Counter/text move without resize handles and use explicit size controls. Freehand and magnifiers resize proportionally; resizing preserves stroke settings. Color/size properties float over the full image workspace without changing its layout. Tools align left with ellipsis overflow; the right status shows live pointer color (Tab to copy), image size and zoom (click to Fit). Shift constrains circular/square and straight-line gestures. The native window sizes to the image within 80% of available display space, uses Fit for large images and hides when empty. Edit and Library are mutually exclusive views; Settings stays independent. Copy/Save/Upload from captures hides the view after successful output/submission.
- **Library:** opens on FTP by default, with a 25% Local/FTP row list and right preview. Rows show relative remote paths, thumbnail, date and status. Double-click Local to resume Edit; double-click FTP to open the frozen HTTPS link in your browser. Thumbnails load lazily and use a bounded cache. Local keeps one entry per image, with a bounded editable draft and its bitmap, for 30 days. Raster derivatives update that entry; copying/saving retains the editable elements. The preview and sidebar footers align; bulk actions copy, delete or remove FTP history. Successfully uploaded jobs retain thumbnails only; clicking loads the full image through HTTPS. Failed/pending jobs keep the frozen full image for explicit retry. Remote FTP deletion requires confirmation; removing local history does not delete server files.
- **Settings:** independent window for General, Hotkeys, Uploading, Advanced and Updates. All settings save automatically; checkbox options precede their labels. Hotkey recorder rows save/apply immediately; the inline × clears one shortcut. Error-only logs have configurable 1–90 day retention and Open Logs Folder. FTP/HTTP passwords are stored in a private local plaintext file (0600), never returned by IPC or written to logs. Normal runtime does not share the uploader's settings or credentials.

Command-W closes the focused window; Command-Q quits; closing a window hides its view and keeps the menu-bar app running. Settings uses Command-comma. FTP Upload uses Command-S; local Save remains a separate explicit action. A predicted/copied URL is pending until the queue reports a completed transfer. Retries preserve the original name, destination and pixels. Random and timestamp naming are selectable for new jobs.

The interface uses shadcn/Radix, Tailwind, Lucide, Motion and native window materials. The app icon retains the uploader symbol in a padded macOS tile; menu glyphs are Lucide-derived. Attribution is in docs/third-party/. Screen Recording and input-event permission may be required for user-triggered capture/scrolling. Native macOS and real-server acceptance is tracked separately from injected tests; see docs/releases/1.0.0.md.

Existing features are **100% USER_REPORTED accepted** as of 2026-11-12. Native update notification delivery/click behavior remains a separate pending version-to-version check. See [current acceptance](docs/releases/ACCEPTANCE.md) and [1.2.0 changes](docs/releases/1.2.0.md).

The shared [interface system](docs/design/INTERFACE.md) defines system typography, rounded controls, form spacing and configurable tokens for all three windows. The pinned [macOS design skill adapter](docs/design/MACOS.md) governs native chrome, surface hierarchy, renderer materials, focus feedback and content states.

## Development

Use Node 26 and the existing Rust toolchain. Do not change global Node defaults.

```sh
npm ci
npm run version:check
npm run tauri dev
```

```sh
npm run test:unit
npm run test:e2e
npm run build
cargo test --manifest-path src-tauri/Cargo.toml --lib --offline
npm run tauri build -- --bundles app
```

package.json is the product-version source. Run `npm run version:sync` after an intentional version change; `npm run version:check` validates UI/native/lockfile/README consistency. Accepted fixes use patch versions; compatible feature releases use minor versions. Versions receive a release summary; commit/push requires explicit user acceptance first. No credentials, captures, raw investigation evidence or build output belong in Git.

FTP settings separate the fixed user folder (for example `/s`) from optional local month grouping (`/s/2611` for November 2026). New uploads freeze their destination when queued; retries retain it. Launch at startup is available in the installed macOS `.app`, not unbundled development/browser runs.

## App updates

Settings and the tray menu provide Check for Updates. Settings shows a spinner while checking and a green tick when current. For an available version, its install icon explicitly downloads, installs and restarts the app after draft/busy checks. Automatic checks never install. GitHub Releases use Tauri-signed updater archives and the configured persistent macOS signing certificate, without notarization. The bootstrap embeds the real public key; configure the private updater key/password as [release secrets](docs/releases/UPDATES.md) to publish updates. See the [1.1.0 candidate notes](docs/releases/1.1.0.md).

Stable version increases in `package.json` pushed to `main` automatically build and publish a versioned GitHub Release. Pushes without a version increase skip release creation. Verification releases retain their documented manual acceptance status.

All product windows reopen centered on the active display. The current release includes source changes for this behavior; installed multi-display and signed-update acceptance are tracked in the release notes.
