# Functional roadmap coverage

Baseline: version 0.1.0 frozen; no dependency/product upgrades or cosmetic UI phase before function acceptance. This maps every existing inventory group to implementation/integration owners. It is a plan, not approval or a claim that unknown Shottr behavior has been recovered. Source: [initial static inventory](../docs/phase-1-features.md). Detailed baseline, explicit parity limits and comparison owners: [ORIGIN-PARITY.md](ORIGIN-PARITY.md). This table reserves scope; see current packets for implementation status.

The [Existing MVP ledger](PROGRESS.md) retains its original scope/weights. Scrolling/advanced features are planned here for the broader requested function set; they are not quietly credited to the older MVP denominator. Parity is not complete while rows have unresolved native acceptance or UNKNOWN semantics. Workers implement documented Ferby choices and flag remaining target questions rather than fabricating equivalence.

## Implementation checkpoint — 2026-11-06 (tests deferred)

Latest user instruction prioritizes complete feature logic and app wiring. Tests in this pass are NOT RUN; type/compile/package checks do not constitute acceptance. Codex snapshots have USER_WAIVED_REVIEW and require later overall review. MVP acceptance remains 68.75%.

| Feature | Current source implementation | Remaining boundary |
| --- | --- | --- |
| F01 | Native explicit primary-display rectangle/repeat with geometry and pixel checks; existing interactive modes | Active-window C26; interactive last-selection provenance and native acceptance |
| F17 | Pixel and bounded region-average RGBA controls in the actual workspace | Original text-color/weighting semantics UNKNOWN |
| F23/F25 | Persistent extended settings, editor/preview/copy/save action, zoom and output scaling | Real native acceptance and original automatic-format rules |
| F24 | Prepared annotated/scaled native PNG file drag and existing copy/save/print paths | Actual Finder/native dialogs/print acceptance; crash-time staging cleanup |
| F30 | Native shortcut registry plus saved assignments with explicit Apply/Clear/Save/Forget | Actual registration/conflict/restart acceptance |
| F31 | Persistent always-on-top and menu bar icon; native desktop/tray menus | Notifications and launch-at-login C29 |
| F32 | Ferby-only native macOS URL queue and source-bound confirmation | Installed-bundle URL delivery; original Shottr route semantics UNKNOWN |
| F04/F05 | Recognition and image import already integrated | Persist OCR preferences C27/A43; native document-open C28 |

The historical allocation table below reserves ownership and records unresolved target questions; use the current source reports/packets for implementation status. No full original Shottr parity is claimed.

| Feature | Requested affordance | Task owners | Remaining boundary |
| --- | --- | --- | --- |
| F01 | Capture modes / active-window / repeat area | C02/C11; A25/P34 | Main/area/window wired; active/repeat acceptance and geometry remain |
| F02 | Scrolling capture | A22/A23/P30/C11 | Frame-stitching core and user-triggered orchestration; arbitrary-app compatibility UNKNOWN |
| F03 | Local text and QR recognition | A11/A12/A33/P23/P24/C08 | Engine, inert results and copy wiring |
| F04 | OCR language and line-break preferences | A11/P21/P23/C08/C10 | Explicit supported language list; target-specific exact rules UNKNOWN |
| F05 | Open image / clipboard image import | A14/P35/C08; current import | Existing disk import; clipboard backend and limits pending |
| F06 | Arrow/line/rectangle/ellipse/freehand | A04/A06/A07/A08/A16/A32/P25/P26/C07/C12 | Current gesture view accepted; extended shapes need explicit contract adapter |
| F07 | Text and counters | A17/P27/P33/C01/C12 | Existing model counter allocation; placement/rendering pending |
| F08 | Highlight / spotlight / magnifier | A18/C12 | Local bounded effects; unknown target defaults not inferred |
| F09 | Blur / conceal / erase | A19/C12 | Bounded synthetic pixel effects; blur is not a privacy guarantee |
| F10 | Annotation styling | A16/A17/A18/P28/C12 | Style controls/render contracts; exact target options UNKNOWN |
| F11 | Crop / selection / uncrop | C03/A32/P25/P26/C07/C12 | Non-destructive crop exists; selection restoration and handles pending |
| F12 | Resize / automatic adjustment | C03/A31/C12 | Resize wired; deterministic Ferby adjustment, exact target algorithm UNKNOWN |
| F13 | Undo / redo / merge | C01/P09/A07/A08/C07 | Model accepted; composed UI and raster merge integration pending |
| F14 | Add capture / composition / snapping | A21/P29/C12 | Explicit deterministic Ferby snapping; target similarity UNKNOWN |
| F15 | Zoom and navigation | P06/P14/A32/C07 | Baseline zoom exists; editor/selection integration pending |
| F16 | PX/PT measurement | P02/A27/C12 | Explicit scale; no Retina inference from image dimensions |
| F17 | Pixel / average / text color | P01/P13/P14/P32/C04/C08 | Pixel inspector integrated; average helper pending; exact text-color semantics UNKNOWN |
| F18 | Backdrop / inset / shadow / recenter | A20/P31/C12 | New bounded bitmap composition |
| F19 | Backgrounds and gradients | A20/C12 | Solid/gradient/caller-owned assets; proprietary templates excluded |
| F20 | Pin image window | A05/P10/C09 | Presentation accepted; restricted window/runtime behavior pending |
| F21 | Session library / local archive | A02/A29/P17/P19/C14 | Session library integrated; explicit Ferby archive pending; target storage UNKNOWN |
| F22 | Preview thumbnail actions | A15/P39/C09 | No upload controls; native display lifetime pending |
| F23 | Post-capture Show/Copy/Save | A24/P34/C10 | Explicit action planning and actual behavior |
| F24 | Copy / save / print / drag | C06/A30/P38/P40/C08/C15 | Copy/save wired; real native acceptance/print/drag pending |
| F25 | Output preferences / downscale | A03/A09/A10/P08/P20/P36/C10 | Controlled settings accepted; actual effects/persistence pending; Auto format rule UNKNOWN |
| F26 | Window background / trim shadow | A26/C11/C12 | Caller-provided pixels and explicit trim; native capture acceptance pending |
| F27 | Shottr Cloud | EXCLUDED | No cloud uploads/accounts/credentials |
| F28 | S3 providers | EXCLUDED | No S3 integration or testing |
| F29 | Share URL signing/options | EXCLUDED | No upload URL generation or account setup |
| F30 | Global shortcut assignment | A25/C13 | No OS shortcut/privacy changes during automation |
| F31 | App/window lifecycle preferences | A28/C10/C13 | Capability-gated controls; native effects are Codex wiring |
| F32 | Deep links | P37/C15 | Ferby-only inert allowlisted intents; Shottr route compatibility UNKNOWN |
| F33 | License/onboarding | EXCLUDED license gates; A25/A28 for own setup | Ferby features unlocked; never alter Shottr license/app state |
| F34 | Diagnostics/telemetry | EXCLUDED; C16 verifies absence | No telemetry added; target behavior remains static evidence only |

FTP remains deferred. No licensing checks/nags in Ferby; no modification of Shottr.app. No external uploads, telemetry, production installation or privacy changes are authorized by this roadmap. Native GUI acceptance requires explicit user action with synthetic/isolated content.

Cross-task API changes: workers export local types/adapter proposals; Codex updates shared contracts after review. Unknown algorithms or unavailable native permissions become explicit blockers, not invented implementations or polling loops.
