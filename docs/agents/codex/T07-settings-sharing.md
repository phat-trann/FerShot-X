# T07: settings, sharing and license declarations

Agent: Codex. Scope: F26-F34 except F32 (Copilot T05). Date: 2026-11-05, Asia/Ho_Chi_Minh.
Status: **DONE for the assigned static review**. Service behavior, current preferences, entitlements and actual diagnostics remain UNKNOWN. No cloud or license action was attempted.

## Evidence boundary

[Task projection](../../../evidence/agents/codex/T07-static.json) derives selected objects/action wiring from REA Evidence `ev_7a54c59efe5ad259d8b8b7c187965d29df9ca99f3686ffa068c92add599df2ca`. It records resource paths/hashes, current hashes and selected classes. The executable identity still matches Shottr 1.9.3 build 137 in [target.json](../../../evidence/target.json). No collection was repeated and no preferences, tokens, license files, keychain or stored screenshots were read.

The settings view resources target external object placeholders: UI-12 `317`, UI-13 `514`, UI-14 `239`, UI-15 `423`; their actual handler implementations remain unresolved. UI-12 hierarchy is partial; UI-13/UI-14 connections are partial. UI-10 is shortcut setup UI, not a dump of active keyboard bindings.

## Findings

| Feature | STATIC_OBSERVED declarations | Unknowns / interpretation limit |
| --- | --- | --- |
| F26 window appearance | UI-15 `riWinBackground:` on objects `30/46/56/66`; Wallpaper/Transparent/Solid Color/Trim shadow labels; color field `93` | Radio-image label-to-control matching and shadow compositing are not resolved from this projection; `#C4C6C8` is an archived string, not the user's chosen color |
| F27 cloud | UI-13 upload-mode popup `28`; Disable Uploading, Shottr Cloud and S3 options; token field `406`, Get a Token `426` | Endpoint URLs, request bodies, quotas, token storage and installed activation state unknown |
| F28 S3 | UI-13 access/secret/bucket fields `90/113/131`; Amazon/Other selectors `151/159`; region/endpoint/prefix fields `181/199/217`; Test Connection `234` | A declared S3-compatible UI does not verify every named provider, signing implementation, key storage or connectivity |
| F29 URLs | UI-13 sharing popup `279`, expiration `308`, public URL `339`; no-URL/presigned/public choices; up-to-seven-days help | Expiration is bundled UI guidance, not a live service test; public bucket accessibility and generated URL correctness unknown |
| F30 shortcuts | UI-10 eight capture/show affordances; Reassign Default `14`, Open System Settings `84`; bundled instructions mention macOS screenshot shortcuts | System-shortcut setup is described, not executed. No active bindings, conflicts or successful reassignment verified |
| F31 general/advanced | UI-12 hide menubar `69`, splash `95`, always-on-top `118`, scroll direction `127/138`, zoom preference `162`, Esc copy/save `187/192`, notification popup `209`; UI-15 launch-at-startup `298` | All values/effects unknown. `updateLargerWindow:` is wired to the caption Prefer 100%, not evidence of an independent larger-window feature |
| F33 license/onboarding | UI-14 Activate `87`, Purchase `131`, Explore hidden features `167`, Restore License `192`; UI-04 update/startup/hotkey/purchase prompts | Requires Activation and regular/extended-license copy do not yield a complete tier matrix. Hidden features are not identified by this caption. Installed license and server behavior unknown |
| F34 diagnostics | UI-12 Allow collection `236→317`; static explanatory copy names performance/errors/usage and OS/display/internationalization metrics and disclaims personal data/images/text/IP collection | This is a publisher statement in the bundle, not an independent privacy audit. Actual enabled state, destinations, payloads, frequency and consent behavior unknown |

F32's `shottr` URL scheme and deep-link option are reviewed by Copilot T05. OCR/scrolling controls in these same documents belong to Antigravity T02 and are not retested here. Save-format controls belong to Copilot T05; post-capture behavior is addressed by Codex T04.

## Static implications

- The upload UI separates provider selection, destination credentials, URL-generation policy and expiration. These are **observed configuration affordances**, not a recovered network API contract.
- The presence of a Test Connection action means a connection test can be requested; it does not establish what that test contacts or whether it writes data.
- An archived default-looking value, selected segment or visible flag cannot establish the user's current configuration. No current preference state is reported.
- Activation, purchase, restore and token buttons can have external effects. They were not invoked to enumerate features.

## Follow-up boundaries

Local synthetic-window appearance tests can follow after the UI slot is available. Observe settings without changing them. Record an exact UI state and synthetic output for any RUNTIME_VERIFIED claim.

Cloud/S3 testing needs a separately scoped test destination and upload authorization; do not infer that an application-analysis request authorizes using an existing account or publishing screenshots. A diagnostics audit would require separately scoped network/runtime observation. These are unresolved follow-ups, not blockers to this completed static review.

No Shottr launch, UI manipulation, clipboard access, settings change, network request to Shottr services, license operation, native decompilation or runtime claim was performed by T07.
