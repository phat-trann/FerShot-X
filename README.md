# FerShot X 1.1.8

A macOS screenshot editor and explicit FTP publisher built with Tauri, Rust and React.

- **Capture:** screen, native area selection, repeat area, active/selected window, and automatic scrolling capture. Start from the menu bar. Scrolling capture selects a desktop region, collects overlapping frames and finishes on Escape or unchanged content, within image/memory limits.
- **Edit:** one compact React Konva toolbar and canvas for selection, shapes, arrows, pen, text/counters, emphasis, crop, resize, blur/pixel effects, color, clipboard, local Save, FTP Upload. Crop applies after Enter; Escape cancels. Image size opens resize presets/dimensions and Crop Region. Blur is an editable, movable layer that preserves source pixels. Select is the initial default; drawing tools stay active after creation until changed or Escape is pressed. Area elements have eight resize handles and center dragging; lines/arrows use endpoint handles. Counter/text move without resize handles and use explicit size controls. Freehand and magnifiers resize proportionally; resizing preserves stroke settings. Color/size properties float over a stable 16:9 image viewport. Tools align left with ellipsis overflow; the right status shows live pointer color (Tab to copy), image size and zoom (click to Fit). Shift constrains circular/square and straight-line gestures. The native window sizes to the image within 80% of available display space, uses Fit for large images and hides when empty. Edit and Library are mutually exclusive views; Settings stays independent. Copy/Save/Upload from captures hides the view after successful output/submission.
- **Library:** opens on FTP by default, with a 25% Local/FTP row list and right preview. Rows show relative remote paths, thumbnail, date and status. Double-click Local to resume Edit; double-click FTP to open the frozen HTTPS link in your browser. Thumbnails load lazily and use a bounded cache. Local keeps one entry per image, with a bounded editable draft and its bitmap, for 30 days. Crop/resize derivatives update that entry; copying/saving retains the editable elements. Search is omitted. Successfully uploaded jobs retain thumbnails only; clicking loads the full image through HTTPS. Failed/pending jobs keep the frozen full image for explicit retry. Remote FTP deletion requires confirmation; removing local history does not delete server files.
- **Settings:** independent window for General, Hotkeys, Uploading and Advanced. Error-only logs have configurable 1–90 day retention and Open Logs Folder. Passwords stay in FerShot X's own Keychain entry. Normal runtime does not share the uploader's settings or credentials.

Command-W closes the focused window; Command-Q quits; closing a window hides its view and keeps the menu-bar app running. Settings uses Command-comma. FTP Upload uses Command-S; local Save remains a separate explicit action. A predicted/copied URL is pending until the queue reports a completed transfer. Retries preserve the original name, destination and pixels. Random and timestamp naming are selectable for new jobs.

The interface uses shadcn/Radix, Tailwind, Lucide, Motion and native window materials. The app icon retains the uploader symbol in a padded macOS tile; menu glyphs are Lucide-derived. Attribution is in docs/third-party/. Screen Recording and input-event permission may be required for user-triggered capture/scrolling. Native macOS and real-server acceptance is tracked separately from injected tests; see docs/releases/1.0.0.md.

Current release publication is pending user-requested native validation/build after the Konva/draft changes. No current bundle is claimed to include these final changes.

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

package.json is the product-version source. Run `npm run version:sync` after an intentional version change; `npm run version:check` validates UI/native/lockfile/README consistency. Accepted fixes use patch versions; compatible feature releases use minor versions. Completed versions receive a release summary and scoped commit/push. No credentials, captures, raw investigation evidence or build output belong in Git.

FTP settings separate the fixed user folder (for example `/s`) from optional local month grouping (`/s/2611` for November 2026). New uploads freeze their destination when queued; retries retain it. Launch at startup is available in the installed macOS `.app`, not unbundled development/browser runs.

## App updates

Settings and the tray menu provide Check for Updates. GitHub Releases use Tauri-signed updater archives and ad-hoc macOS app signing, without Developer ID/notarization. The bootstrap embeds the real public key; configure the private updater key/password as [release secrets](docs/releases/UPDATES.md) to publish updates. See the [1.1.0 candidate notes](docs/releases/1.1.0.md).

Stable version increases in `package.json` pushed to `main` automatically build and publish a versioned GitHub Release. Pushes without a version increase skip release creation. Verification releases retain their documented manual acceptance status.
