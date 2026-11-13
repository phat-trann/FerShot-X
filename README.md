# FerShot X 1.3.1

Capture, annotate and share screenshots from your Mac’s menu bar. Keep editable Local drafts or upload to your own FTP server and copy a ready-to-share link.

**Requires macOS 12 or later and Apple Silicon (M-series).** Older releases include Intel builds; new releases target Apple Silicon only.

## Install

1. Download the latest `.dmg` from [Releases](https://github.com/phat-trann/FerShot-X/releases/latest).
   Choose the **aarch64** download for Apple Silicon (M-series). Older Universal/Intel assets remain available in their original releases.
2. Open it and move **FerShot X** into **Applications**.
3. Launch FerShot X. Library opens first; the menu-bar icon provides capture actions and Settings.
4. Allow **Screen Recording** when prompted. Scrolling capture also needs **Accessibility** access in System Settings → Privacy & Security.

The app is signed with a self-signed certificate and is not Apple-notarized. macOS may require approval in Privacy & Security before its first launch.

## Capture and edit

Choose **Capture Screen**, **Capture Area** or **Scrolling Capture** from the menu-bar menu. **More** includes repeat-area and window capture, Open File and Load From Clipboard. Capture Screen uses the display under the pointer. Press Escape to cancel an ordinary capture or finish a scrolling capture with the images collected so far.

A captured image opens in Edit. Draw arrows, rectangles, ellipses or freehand strokes; add text, counters, highlights, spotlights, magnifiers or editable blur. Use **Add Image** to insert another file or capture into the current image.

- **Select** moves and resizes existing elements. Lines and arrows use endpoint handles; text and counters use their size controls.
- Hold **Shift** while drawing to constrain squares, circles and straight lines.
- Drawing tools stay active for repeated drawing. Freehand draws continuously; switch to Select to move or resize a stroke.
- **Magnifier:** draw an ellipse to mark the source. The source ellipse owns the move/resize handles. A connected lens displays the source at its Magnification size; drag the lens to reposition it, or move/resize the source to adjust the sampling region. New lenses start with a 32px edge gap on the roomiest fitting side. Dragging/resizing the source hides the lens and connector until release or cancellation; moving the detached lens keeps both visible. Hold Shift while drawing for a circle.
- **Spotlight:** the dimmed background hides while you move/resize its region and returns on release.
- **Text:** click the image to place a blank caret and type directly. Enter or an outside click commits; Escape cancels. Double-click existing text to edit it in place.
- **Counter:** drag its corner handle to any angle; arrow keys adjust by 15°, or 1° with Shift.
- Color and size controls follow the selected element. New elements reuse the last style.
- Click the **image size** to resize proportionally. Press Resize to apply; Escape or an outside click cancels.
- Scroll with two fingers to pan; pinch to zoom. Mouse-wheel zoom and Command-wheel zoom are also supported. Zoom follows the pointer; click the zoom percentage for a zoom slider (1–800%) with a clickable Fit marker above the matching percentage.
- Hover a tool to see its name and shortcut. Tools that do not fit appear under **…**.

Use **Copy**, **Save** or **Upload** from the toolbar. Successful capture output hides Edit; Library keeps a resumable Local draft unless the image has been uploaded. A predicted FTP link becomes usable only after the transfer succeeds.

## FTP uploading

Open **Settings → Uploading** and enter your FTP host, port, username, password, remote folder and public base URL. Enable **Require explicit TLS (FTPS)** if your server supports explicit FTPS. FTP credentials and HTTP preview credentials are separate: configure HTTP authentication here if your image URLs require it.

The remote folder identifies your upload location, for example `/s`. Optional month grouping adds a folder such as `/s/2611` for November 2026. Choose random or timestamp filenames for new uploads. An upload’s destination, filename and image remain fixed on retries.

Press **⌘S** in Edit to queue the edited image for upload. The URL is predicted immediately; transfer progress and failures appear in **Library → FTP**. Failed uploads can be retried.

Enable **Upload Captures Immediately** in the menu-bar menu to skip Edit and upload new captures directly. Captures with partial scrolling results or upload failures return to Edit for recovery.

## Library

**FTP** is the default tab. Select an image to preview it; double-click to open its HTTPS URL in your browser. Completed uploads keep a thumbnail on disk and load the full preview over HTTPS. Recently viewed FTP previews are cached temporarily in memory; Refresh clears that preview cache. Pending and failed uploads retain their image for retry.

**Local** retains editable images for **30 days**. Double-click an entry, or use its Edit icon, to continue editing with its elements intact. Copied and saved images remain available here; successfully uploaded images appear in FTP.

Use **⌘-click** to select individual rows, **Shift-click** to select a range or **⌘A** to select all. The selection toolbar supports copying and deletion. Copying multiple FTP links lists them from oldest to newest.

**Remove history** clears FTP history without deleting server files. **Delete from FTP** permanently removes the remote image and requires confirmation. Removing a Local cached copy does not delete a file saved elsewhere.

## Settings and shortcuts

Settings opens in a separate window. Changes save automatically; shortcut rows apply as soon as a valid key combination is recorded. Use the inline × to clear a shortcut. **Launch at startup** is available in the installed app.

| Shortcut | Action |
| --- | --- |
| ⌘, | Settings |
| ⌘S | Upload the edited image |
| ⌘C | Copy the edited image, or selected Library items |
| Escape | Cancel an active operation; otherwise copy and hide Edit |
| ⌘Z / ⇧⌘Z | Undo / Redo in Edit |
| Tab | Copy the color under the pointer in Edit |
| ⌘W | Close the focused window |
| ⌘Q | Quit FerShot X |

Capture shortcuts are configured in **Settings → Hotkeys** and shown in the menu-bar menu. Closing a window keeps FerShot X running in the menu bar; ⌘Q exits completely.

## Updates

FerShot X checks for updates on launch and daily while running. Open **Settings → Updates**, or choose **Check for Updates** from the menu-bar menu, to check manually. A spinner means checking; a green tick means the app is current.

When a new version is available, click its **install icon** to download, install and restart. Automatic checks never install updates. Installation waits for active image and FTP operations; resolve a busy/error state and retry if necessary.

## Privacy and troubleshooting

Images stay on your Mac unless you explicitly upload them or enable immediate uploads. FTP/HTTP passwords are stored locally in a private plaintext file readable by your macOS account; they are not stored in Keychain or included in logs.

For a failure, open **Settings → Advanced → Open Logs Folder**. Error logs have configurable retention. When reporting an issue, include the app version, steps, expected/actual behavior and relevant error log; remove private URLs or image content before sharing.

For FTP preview errors, verify the public URL and HTTP credentials. For capture/scroll failures, check macOS privacy permissions and the scroll-speed setting. If an update fails, retry from Updates and include its displayed error in your report.

## Screenshots to add

The following screenshots would make this guide easier to follow. Use sample images and hide server names, credentials and private URLs:

- `docs/images/edit.png`: Edit with arrows, text and blur; show the toolbar and contextual properties.
- `docs/images/library.png`: FTP Library with several sample rows and a loaded preview.
- `docs/images/upload-settings.png`: Uploading settings with example values and password fields empty.
- `docs/images/updates.png`: Updates showing an available version and the install action.

No placeholder screenshots are displayed until these files are supplied.

## Development and release notes

See [development instructions](docs/DEVELOPMENT.md), [1.2.2 release notes](docs/releases/1.2.2.md) and [updater configuration](docs/releases/UPDATES.md). UI conventions are documented in the [interface system](docs/design/INTERFACE.md). Third-party notices are in [docs/third-party](docs/third-party).
