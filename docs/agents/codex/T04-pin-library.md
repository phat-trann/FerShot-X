# T04: pin, library and preview investigation

Agent: Codex. Scope: F20-F23. Date: 2026-11-05, Asia/Ho_Chi_Minh.
Status: **PARTIAL** — static scene/control mapping complete; runtime behavior remains UNKNOWN. No user screenshot library was opened or indexed.

## Sources

Target remains Shottr 1.9.3 build 137; installed executable hash matches [target identity](../../../evidence/target.json). [Task projection](../../../evidence/agents/codex/T04-static.json) selects seven documents from saved REA Evidence `ev_7a54c59efe5ad259d8b8b7c187965d29df9ca99f3686ffa068c92add599df2ca`, with current/observed archive hashes, object IDs, declared classes and coverage. This is a projection, not new canonical Evidence.

## Scene boundaries

| Scene | STATIC_OBSERVED declarations | What this does not prove |
| --- | --- | --- |
| Library | UI-06 object `7`: `_TtC6Shottr17LibViewController`, nib `bU7-R8-ocO-view-tOy-S4-hL0`; UI-07 controls target external placeholder `409` | Runtime controller binding, storage location, indexing or library lifetime |
| Pin | UI-09 object `7`: `_TtC6Shottr19PinWindowController`; content object `23`: `_TtC6Shottr17PinViewController`, nib `Ma0-De-PqN-view-rnf-7n-jyj` | Window stacking, persistence or independent editing model |
| Preview | UI-17 object `7`: `_TtC6Shottr23PreviewWindowController`; content object `23`: `_TtC6Shottr21PreviewViewController`, nib `NJi-sV-KQJ-view-bhd-SB-Gtf` | Automatic thumbnail timing or actual action execution |

The nib names line up with the corresponding view resources. This is a static association; the external placeholders in the view files have not been resolved into runtime objects.

## Findings

| Feature | STATIC_OBSERVED action wiring | Runtime questions |
| --- | --- | --- |
| F20 pin | UI-09 Edit `32`, Copy `43`, scale `46/48/50` for 50/100/200%, Semi-transparent `52`, Close `55` all target object `23`; UI-08 view buttons `27/39/80` target placeholder `145` | Are pin changes independent from the editor? What scale/opacity applies? Does closing affect the source? Does the pin survive relaunch? |
| F21 library | UI-07 `NSSearchField` `123→409` dispatches `search:`; layout popup `258→409` dispatches `selectLayout:`; File List and three tile-size labels; more/settings/popover/progress actions at `20/247/297/82` | Search fields, filtering, supported files, settings and progress semantics remain unknown. Cancel is observed on the progress action, not proof of a particular indexing job. |
| F22 preview | UI-16 custom buttons dispatch `clickEdit:` `9`, `clickCopy:` `27`, `clickSave:` `37`, `clickUpload:` `47`, `clickOCR:` `57`, `btnPin:` `67`, `btnClose:` `142`, all to placeholder `245` | Transition destinations, close/lifetime policy and side effects remain unverified. Most button captions are not decoded; selector names are not visible UI labels. |
| F23 post-capture | UI-15 Thumbnail `303` and Editor `316` dispatch `changeAreaCropBehavior:`; Show/Copy/Save `321/326/331` dispatch individual actions; close-policy popup `340` dispatches `selectThumbnailClosing:`; target placeholder `423` | Mutual exclusivity, combinability, current preferences and event order cannot be inferred. No settings changed. |

Library, pin-view and preview-view connection facets are partial in REA. Pin controller UI-09 has complete recognized connection coverage. Even complete archive coverage does not establish execution. Generic Button/Label placeholders should not be exposed as product features.

## Bounded runtime plan

- F20: after obtaining runtime-shottr, pin the synthetic T03 PNG; observe scale and opacity with only this fixture. Record source/editor/pin window identity and whether closing one affects the others.
- F21: use an already isolated fixture-only library location if the app permits it without altering user settings. Otherwise record the blocker; do not inspect the user's existing screenshot history to satisfy the test. Search synthetic filenames/text separately and record which actually matches.
- F22: test edit/copy/save/pin/close on a synthetic preview only. Do not exercise Upload; OCR belongs to Antigravity T02 and should be referenced from its handoff rather than repeated.
- F23: observe current behavior without editing preferences. If different options require changing user settings, leave those combinations unverified.

No runtime check above was executed. No UI/clipboard action, REA active native session or runtime claim was acquired. Persistence, OCR search, cloud sync, retention and any particular database format remain UNKNOWN.
