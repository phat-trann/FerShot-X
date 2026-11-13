# Interface system

Apply the project-installed macOS design skill through [MACOS.md](MACOS.md). That adapter records which upstream rules apply and which explicit product decisions take precedence.

All interface controls come from `src/components/ui`. Use the existing shadcn/Radix Button, Switch, Toggle, Tabs and AlertDialog and the shared Input, NativeSelect, Slider, Checkbox, Radio and Progress primitives. Native DOM controls are implemented only inside this library; semantic layout, labels, images and canvases remain ordinary HTML. This preserves accessibility, input methods, forms, keyboard operation and existing event/IPC contracts without another runtime framework.

## Tokens

Edit `src/styles/tokens.css` to configure the system. `design-system.css` applies the contract across all windows. Component details belong in `components/ui/controls.css`; window styles must consume these tokens rather than introduce another control scale.

| Property | Token / default |
| --- | --- |
| UI family | `--font-ui`: `system-ui, -apple-system, BlinkMacSystemFont, sans-serif` |
| Body / label / caption / heading | 14 / 14 / 12 / 16 px |
| Body / control / heading weight | 400 / 500 / 600 |
| Body line height | 1.5 |
| Control height | `--control-height`: 32px |
| Control radius / horizontal padding | 12 / 12px |
| Field internal gap / form row gap | 8 / 16px |
| Panel radius / padding | 20 / 20px |
| Spacing scale | 4, 8, 12, 16, 24, 32px |
| Base / elevated | #232427 / #303136 |
| Accent / selected | #257EFE / #0F1216 |
| Primary / secondary text | #FFFFFF / #DEDEDF |
| Selected border | 0.5px, white at 14% |

## Usage

- Actions: Button, with an explicit leading Lucide icon (`icon={Save}`) or an existing leading icon child. All variants use compact Edit geometry, 32px height, 12px rounding, an 8px icon/text gap, a fine border and an actual background. `default`/`link` use blue with white content; `success` green, `warning` amber and `destructive` red use tinted surfaces/borders. `secondary`/`outline`/`ghost` use a neutral raised gray surface and white content. Hover brightens the surface; selected Edit tools keep #0F1216. Tool-strip actions also have subtle frames and raised surfaces. Keep variant intent explicit, not inferred from the rendered text. Reserve `plain` for custom geometry such as canvas handles, Library rows and the fixed status strip. It preserves the shared ref/event/disabled contract without imposing a form button's layout. Dialog actions reuse Button through Radix Slot.
- Forms: Input, NativeSelect, Slider, CheckboxField for control-first Settings options, SwitchField for retained labelled switches, Checkbox for item inclusion and Radio for mutually exclusive values. Keep labels associated with their control and native constraint validation. FieldGroup, FieldLabel and FieldDescription supply reusable form layout/typography. SwitchField always renders the label first and the switch last; do not reverse rows with CSS.
- Prefer `--field-gap`, `--form-gap`, `--control-gap` and `--space-*` over independent margins. FTP/HTTP form labels use FieldLabel.
- Preserve pill-shaped switches, circular radio/slider thumbs and small canvas handles. Form rounding must never change canvas hit targets or document geometry.
- Use subtle brightness for keyboard focus, disabled opacity, selected background/border and semantic success/warning/error messages. No browser focus rings. Respect reduced motion.
- UI font tokens do not change annotation fonts or exported pixels.

Settings uses 25.92px navigation icons (10% smaller than 28.8px), tab labels at 88% of the caption size (10% larger than the previous 80%), centered 72px tabs and a compact header. Keep the 12px navigation top inset and 24px content top inset. Rows use `--settings-row-gap: 6px`; sections use `--settings-section-gap: 12px`, each half of C112. Groups have no card padding, with thin separators between sections. Remove legend nodes, preserve accessible group names with aria-label and keep native fieldsets for disabled/form semantics. Keep 32px controls even in dense layouts. Text/select/slider rows keep right-aligned labels and center-line controls; checkbox rows put the checkbox first with its linked label to the right. Keep Settings layout rules in `PreferencesWindow.css`; shared component styles must not add competing group margins or reverse control order.

## Publication

Changes remain local candidates until the user explicitly accepts them. Do not commit, push or trigger a release before that acceptance, even when automated checks pass.

## Hotkey recorders

Hotkeys uses seven borderless rows with right-aligned labels and 160×28px shortcut capsules, following the reference image. Assigned values display macOS modifier glyphs; empty values say Record Shortcut. An inline circled × clears only that row. Recording and clearing save/apply immediately through the existing atomic native command; other assignments are preserved, pending requests disable editing and failures retain confirmed values. Escape, unmodified Tab and focus loss cancel recording. Physical Key/Digit codes avoid shifted-number or Option-character errors. No Install/Remove footer appears in normal operation; Reset Shortcuts appears only when native state explicitly reports a fault requiring cleanup. Recorder/clear buttons use specialized geometry through the shared Button primitive.

## Verification

The source guard rejects direct button/input/select/textarea/progress tags outside the UI library, legend nodes and action buttons without a leading icon. Control tests exercise callback, disabled-fieldset, reset, form values and Slot event/ref forwarding. Browser checks verify computed tokens, rounding, form persistence, dialog cancellation and fixed editor geometry across all three windows. Native/server acceptance remains separate.

Settings changes persist automatically through the existing IPC commands. Coalesce rapid edits for 300ms, serialize writes and retain the latest pending snapshot; never overwrite newer inputs with an older acknowledgement. Do not save on initial load. Invalid edits remain visible and cancel pending valid snapshots; errors stay retryable. Flush pending changes on window blur/unmount; Settings has no Done button or footer. General/Advanced, FTP/HTTP credentials, export name, scroll speed and log retention have no Save buttons; Hotkeys retain their immediate transactional path. Explicit folder dialogs and updater check/install/restart actions remain explicit.

Settings panels share Hotkeys’ centered 420px maximum width and `minmax(0,1fr) 50%` rows: right-aligned labels, controls beginning at the center line. This applies to text/select/slider options, FTP/HTTP fields, export destination and update versions; checkbox rows reverse control/label order in real DOM. Settings content locally uses 12px UI/labels and 11px supporting text without changing Edit/Library or header sizing. Save destination and FTP publishing are always-visible semantic sections, never details/summary dropdowns. Keep descriptions concise, controls 32px high, contained scrolling and compact export-folder actions.

Edit tool controls override the shared framed action style: rest state has transparent background/border; hover adds the elevated surface and fine border without moving layout. Selected tools/presets use accent ink without a persistent fill. Apply this to toolbar, overflow/add-image menus and crop/resize actions; Settings/Library stay framed. The size popover uses the compact reference below: segmented text presets, dimension fields and a single apply action. Editable color inputs are full-bleed 32×32px squares with no padding, border or rounding; the read-only pointer-color indicator stays circular.

Edit image content uses the full available workspace below the toolbar, without an inset frame, padding or a fixed viewport aspect ratio. Image proportions and small-image 100% opening scale remain intact; Fit uses the available width/height. Property popovers never reduce the workspace. Crop fits the same content area without reserved inline-toolbar space. Native window sizing is separate and unchanged.

Settings groups use a left-aligned heading followed by a thin line through the remaining row; no standalone duplicate group separators. Remove static explanatory copy and routine saved/cleared notices. Keep actionable errors and updater progress/version/install feedback. Folder selection/reset are accessible icon-only buttons in the same row as the read-only folder field. Startup retry is a bare icon after the startup checkbox label with a short tooltip; disabled-state context remains accessible. All writes and user-driven folder dialogs retain their current IPC behavior.

Updates shows the real app icon, Current version with an adjacent icon-only Check for Updates button, and New version plus an inline install icon when an update exists. Checking uses a spinner; current status is a green check, with no redundant up-to-date text. An explicit install click downloads, installs and restarts through the guarded controller; keep progress and actionable failures. Test Notification is absent from Settings; background native update notifications remain unchanged. Footer actions are absent; failures appear in the content area. CheckboxField links a control-first Checkbox to its label and places retry actions after the text, outside the label so they never toggle the setting.

The Resize popover follows the compact reference: text-only 25/33/50% and 1×/2×/4× presets, 24px compact controls, proportional dimensions and one blue Resize action. No Crop Region, Cancel or close icon; Escape/outside click dismisses without applying. This is an explicit exception to leading action icons and 32px standard form geometry. Settings startup/update/log utility actions are bare 24px Lucide icons after their text. Library always reserves the same metadata line before/after image decoding. Edit is positioned on the pointer’s display work area when opening a document; native validation remains separate from renderer checks.

Updater Apply is explicitly user-triggered and owns one busy lock across download, draft preparation, native operation/FTP guard, installation and restart. Automatic checks never invoke it. Busy failures can retry without downloading verified bytes again; installation failure requires a fresh check, and restart failures allow restart-only retry.

Window bodies, headers, Settings navigation and Library sidebar share the same opaque #232427 base. Surface aliases and material tokens consume that base rather than independent alpha tints. Raised popovers/context panels use #303136 consistently; inputs/selected controls retain #0F1216. Preserve semantic status colors, actual images and transparency checkerboards. This uniform-color requirement supersedes earlier translucent per-region tint choices.
