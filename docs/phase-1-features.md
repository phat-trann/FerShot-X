# Shottr 1.9.3: initial feature analysis

## Scope and result

The installed Shottr declares a screenshot capture and editing workflow with OCR/QR recognition, annotations and concealment, pixel/color inspection, image composition, pinning, a library interface, export, and cloud/S3 sharing. These findings come from static inspection of the installed application, not a website feature list or a runtime test.

Target: `/Applications/Shottr.app`, version **1.9.3**, build **137**, bundle ID `cc.ffitch.shottr`. Analysis date: 2026-11-05, Asia/Ho_Chi_Minh.

The executable is a universal Mach-O containing `x86_64` and `arm64` slices; REA selected `arm64`. Bundle metadata declares macOS 12 as the minimum. AppKit dependencies, Swift runtime imports and compiled storyboards indicate a native macOS UI. Dependency presence does not establish which framework implements a particular feature.

## Method and evidence

| Reference | Actual REA operation | Observed result |
| --- | --- | --- |
| E-PLIST | `inspect-plist /Applications/Shottr.app` | Version/build, image document types PNG/JPEG/GIF, URL scheme `shottr`, main storyboard |
| E-UI | `decode-interface-builder /Applications/Shottr.app` | 17 documents, 365 recognized text observations, 217 action nodes; these are not feature counts |
| E-NATIVE | `inspect-macho /Applications/Shottr.app` | Universal Mach-O, architecture/build metadata, dependencies and symbols |

Full Evidence IDs and the executable SHA-256 are in [target identity](../evidence/target.json). [UI signals](../evidence/ui-signals.json) retain archive hashes, node IDs and selectors. [Native summary](../evidence/native-summary.json) preserves the native metadata. Full records remain locally under `evidence/raw/`.

For this phase every feature below is **STATIC_OBSERVED**: the label, setting or action exists in packaged resources. Every feature remains **UNKNOWN at runtime** until tested. Specific interpretations beyond literal labels are identified separately. The [multi-agent integration review](integration-review.md) adds controller/action mapping and reviews Copilot and Antigravity results. T02's native observation attempts failed on Screen Recording and Accessibility permissions; observed imports support only labeled implementation hypotheses.

## Feature inventory

UI references link to the corresponding document in the [decoded inventory](ui-inventory.md). Feature IDs are stable handoff identifiers.

| ID | Feature group | Observed affordances | Evidence | Runtime question |
| --- | --- | --- | --- | --- |
| F01 | Screen capture modes | Fullscreen, area, active window, any window, repeat area | [UI-10](ui-inventory.md#ui-10) shortcut labels | Trigger each mode on a synthetic window; confirm selection and output |
| F02 | Scrolling screenshots | Scrolling screenshot hotkey; maximum height, speed and reverse-autoscroll preferences | [UI-10](ui-inventory.md#ui-10), [UI-12](ui-inventory.md#ui-12), [UI-15](ui-inventory.md#ui-15) | Supported apps, stitching quality, stopping behavior and height limits |
| F03 | Text and QR recognition | Instant Text/QR Recognition; Recognize Text or QR; preview `clickOCR:` | [UI-03](ui-inventory.md#ui-03), [UI-10](ui-inventory.md#ui-10), [UI-16](ui-inventory.md#ui-16) | Recognition accuracy, QR payload handling and actual output destination |
| F04 | OCR preferences | Primary OCR language and removal of line breaks | [UI-12](ui-inventory.md#ui-12) | Available languages and exact formatting rules |
| F05 | Import existing images | Open File, Open From Clipboard; PNG/JPEG/GIF declared as editable document types | [UI-02](ui-inventory.md#ui-02), E-PLIST | Supported encodings, animation behavior and clipboard representations |
| F06 | Basic annotations | Arrow, line, rectangle, oval, freehand drawing | [UI-02](ui-inventory.md#ui-02) labels and `menu*:` actions | Editing, selection, handles, keyboard interactions and persistence |
| F07 | Text and numbered markers | Text, Counter; text and correction controls | [UI-02](ui-inventory.md#ui-02), [UI-03](ui-inventory.md#ui-03) | Text formatting and counter sequence behavior |
| F08 | Emphasis | Highlighter, Spotlight and Magnifier | [UI-02](ui-inventory.md#ui-02) | Rendered effects, layering and configuration |
| F09 | Concealment and erasing | Blur, Blur Text, Erase, Erase Text; conceal-type action | [UI-03](ui-inventory.md#ui-03) | Region/text targeting and exported pixel results; no privacy guarantee inferred |
| F10 | Annotation styling | Actions for line type, arrow type/style, fill, shape, transparency, size and color | [UI-03](ui-inventory.md#ui-03) | Available styles, defaults and per-object behavior |
| F11 | Crop and selection | Crop, Cut Out, Reset Selection, Reset Crop; `menuUncrop:` | [UI-02](ui-inventory.md#ui-02), [UI-03](ui-inventory.md#ui-03) | Crop restoration, selection bounds and destructive/non-destructive behavior |
| F12 | Image resize and automatic adjustment | Resize Image with width/height controls; Autoadjust | [UI-03](ui-inventory.md#ui-03) | Resampling, aspect-ratio rules and what Autoadjust actually changes |
| F13 | Undo/redo and merge | Undo, Redo, Rasterize (Merge) Image | [UI-02](ui-inventory.md#ui-02) | Undo scope and rasterization effects; resize UI warns it cannot be undone |
| F14 | Composition and snapping | Add Capture, Snap to Objects, Snap to Similar Objects | [UI-02](ui-inventory.md#ui-02) | Capture placement and meaning of object similarity; algorithms are unknown |
| F15 | Zoom and navigation | Zoom in/out, fit, 100%, selection; selection corners, mouse-wheel direction | [UI-02](ui-inventory.md#ui-02), [UI-03](ui-inventory.md#ui-03), [UI-12](ui-inventory.md#ui-12) | Coordinate behavior and keyboard/mouse interactions |
| F16 | Pixel/point measurement | Imprint Selection Size, Selection Size, PX/PT, logical-point mode and measurement help | [UI-03](ui-inventory.md#ui-03) | Retina scaling and measurement output on multiple display scales |
| F17 | Color inspection | Copy Pixel Color, Text Color, Average Color; Color Format; help names Tab, Shift+Tab and C | [UI-03](ui-inventory.md#ui-03) | Actual formats, sampling area, color space and clipboard result |
| F18 | Backdrop composition | Backdrop, Shadow, Inset, Recenter, inner/outer radii and aspect presets; Recenter is wired to `clickAutocrop:` and Remove to `clickReset:` | [UI-05](ui-inventory.md#ui-05), [T03](agents/codex/T03-editor.md) | Output layout and actual action behavior; selector names do not establish additional operations |
| F19 | Background styles | Solid, Colormix, Image; mesh/vertical/diagonal/radial gradients, Image Blur | [UI-05](ui-inventory.md#ui-05) | Available templates, custom image source and effect rendering |
| F20 | Pin image on screen | Pin to Screen; pin-window Edit, Copy, 50/100/200%, Semi-transparent and Close | [UI-02](ui-inventory.md#ui-02), [UI-09](ui-inventory.md#ui-09) | Window placement, stacking, persistence and transparency |
| F21 | Screenshot library interface | Library storyboard with search, File List and small/medium/large tiles | [UI-07](ui-inventory.md#ui-07) | Source folder, persistence, metadata/search scope and actions are not yet established |
| F22 | Preview thumbnail | Edit, Copy, Save, Upload, OCR, Pin and Close actions | [UI-16](ui-inventory.md#ui-16) | Thumbnail lifetime and transitions to editor/pin |
| F23 | Post-capture automation | After screenshot: Show/Copy/Save; area-crop Editor/Thumbnail options; preview-close behavior | [UI-15](ui-inventory.md#ui-15) | Whether options combine and when each action fires |
| F24 | Local output | Copy Image, Save Image, Save Image As, Print and drag-and-drop affordance | [UI-02](ui-inventory.md#ui-02), [UI-03](ui-inventory.md#ui-03) | Clipboard types, print output and drag destination formats |
| F25 | Output preferences | Screenshots folder, Auto (PNG/JPEG), PNG, downscale Retina to 1x when saving | [UI-15](ui-inventory.md#ui-15) | Auto-format decision, filenames, quality and scaling rules |
| F26 | Window-capture appearance | Wallpaper, Transparent, Solid Color, Trim shadow | [UI-15](ui-inventory.md#ui-15) | Resulting window/shadow pixels and platform restrictions |
| F27 | Shottr Cloud sharing | Upload Image; uploading mode Shottr Cloud; token and get-token controls | [UI-02](ui-inventory.md#ui-02), [UI-13](ui-inventory.md#ui-13) | API contract, activation requirements, quotas and runtime upload behavior; no upload attempted |
| F28 | S3-compatible sharing | S3 mode names Amazon/Cloudflare/Backblaze; bucket, keys, region/endpoint, prefix, Test Connection | [UI-13](ui-inventory.md#ui-13) | Provider compatibility and request signing; no credentials accessed or connections tested |
| F29 | Share URL options | No URL, presigned URL, public-bucket URL and expiration controls; UI says presigned links last up to 7 days | [UI-13](ui-inventory.md#ui-13) | This is UI-declared policy, not independently verified service behavior |
| F30 | Global shortcuts | Assignable actions and instructions for reassigning macOS screenshot shortcuts | [UI-10](ui-inventory.md#ui-10) | Effective bindings and conflicts; no user bindings changed |
| F31 | App/window preferences | Launch at startup, hide menubar/splash, always-on-top, default zoom, Esc copy/save and notifications | [UI-12](ui-inventory.md#ui-12), [UI-15](ui-inventory.md#ui-15) | Effective settings, defaults and behavior on this machine remain unknown |
| F32 | Deep links | Bundle URL scheme `shottr`; Enable deep links preference | E-PLIST, [UI-12](ui-inventory.md#ui-12) | Accepted commands/parameters and side effects; no URL invoked |
| F33 | License and onboarding | Activate, Purchase, Restore License, Setup Hotkeys, Run at Startup, update prompts | [UI-04](ui-inventory.md#ui-04), [UI-14](ui-inventory.md#ui-14) | Entitlements and installed license state remain unknown |
| F34 | Diagnostics preference | Allow collection; bundled text describes metrics and says images/text are not collected | [UI-12](ui-inventory.md#ui-12) | UI wording is observed; actual telemetry behavior is unverified |

## Ambiguous signals and exclusions

- `editorGIF:` is a connected action, and GIF is a declared document type. Neither proves screen recording, video export or full animated-GIF editing. Keep those capabilities **UNKNOWN**.
- T03 resolves archived control destinations and preserves slider/key declarations. These are not effective bindings, current preferences, pixel-unit limits or proof of native handler implementation. One focused REA native trace returned `provider_unavailable`; see [T03](agents/codex/T03-editor.md).
- `Show Annoying Fellow`, `menuShotty:` and purchase/onboarding resources exist. They are product/onboarding affordances rather than evidence of a separate capture engine.
- Standard AppKit spelling, substitutions, find and speech menus are archived. Their presence alone does not establish Shottr-specific document/search or speech features, so they are not promoted to separate product features here.
- Library search is visible in the resource; OCR-indexed search, cloud sync, retention and a particular storage database are not established.
- No native function decompilation, capture-quality benchmarks, permission checks, network observation or runtime UI verification was performed. No Hopper/Ghidra installation was needed for this phase.
- No pricing, performance, licensing-tier matrix or completeness claim is inferred from resources.

## Coverage and next work

REA decoded 17 compiled UI documents. Of 69 coverage facets, 60 are complete and nine are partial: connection coverage is partial in eight documents, and hierarchy coverage is partial in one. The aggregate graph reports truncation. Unrecognized/private fields, omitted connections, unresolved hierarchy links, dynamic controls, enabled/hidden state and implementation remain unknown. The decoded set is not proof that every possible feature has been found.

The Phase 1 checklist is **answered** for installed target identity, static feature inventory, repository setup and coordination. Runtime correctness and implementation details are **unresolved follow-up work**. See [the board](../coordination/BOARD.md) for ownership and task boundaries.

T03/T04 static investigation and T07 static settings review now have reports; Copilot T05's four static findings are accepted with documentation caveats. Runtime verification remains open. T02 takes the first UI slot, followed by fixture-only T03/T04 checks when ownership permits. Interactive tasks share one runtime claim. T05's proposed setting-changing tests are deferred; upload tests need a separately agreed test account and explicit upload scope. See the [integration review](integration-review.md) and [board](../coordination/BOARD.md).
