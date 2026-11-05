# T03: editor, backdrop and measurement investigation

Agent: Codex. Scope: F06-F19. Date: 2026-11-05, Asia/Ho_Chi_Minh.
Status: **PARTIAL** — static investigation complete; runtime and native handler bodies remain unverified. Antigravity has the first planned UI slot; this task did not control Shottr.

## Sources and identity

Shottr 1.9.3 build 137 at `/Applications/Shottr.app`. The current executable SHA-256 matches [target.json](../../../evidence/target.json). Selected resource hashes were rechecked against installed files.

The source is REA Evidence `ev_7a54c59efe5ad259d8b8b7c187965d29df9ca99f3686ffa068c92add599df2ca` from the saved Interface Builder observation. [Task evidence](../../../evidence/agents/codex/T03-static.json) is a derived projection retaining action node IDs, object IDs, resource hashes and coverage. It is not a new canonical Evidence record. [UI inventory](../../ui-inventory.md) supplies readable labels.

| UI document | Exact resource suffix under `Contents/Resources/` | Coverage relevant here |
| --- | --- | --- |
| UI-02 | `Base.lproj/Main.storyboardc/MainMenu.nib` | Objects/connections complete in REA's recognized model |
| UI-03 | `Base.lproj/Main.storyboardc/NSWindowController-B8D-0N-5wS.nib` | Connections partial |
| UI-05 | `Base.lproj/Main.storyboardc/t3D-RU-alS-view-Yr0-zl-Dzc.nib` | Connections partial |

## Observed control boundaries

- **STATIC_OBSERVED:** UI-02 draw actions, crop reset and rasterization target object `7`, archived class `_TtC6Shottr11AppDelegate`. This is resource-level routing; it does not prove the class implements those methods or identify a downstream algorithm.
- **STATIC_OBSERVED:** UI-03 width/height, resize, tool styling, color format and zoom controls target object `659`, archived class `_TtC6Shottr14ViewController`. Crop and selection/export segment actions instead target `488`, `_TtC6Shottr20MainWindowController`.
- **STATIC_OBSERVED:** UI-05 backdrop actions target object `471`, an `NSNibExternalObjectPlaceholder` named `UpstreamPlaceholder-1`. The actual runtime receiver is **UNKNOWN**; assigning it to a guessed Backdrop controller would overstate this record.
- `undo:` and `redo:` have null archived destinations. The actual receiver is **UNKNOWN**; no controller or undo implementation is inferred.

## Feature findings

All rows are **STATIC_OBSERVED**. Runtime status for every row is **UNKNOWN**.

| Feature | Concrete observation and object IDs | Unresolved behavior |
| --- | --- | --- |
| F06 | UI-02 Arrow `28→7`, Rectangle `38→7`, Freehand `43→7`, Oval `73→7`, Line `78→7` | Geometry, hit-testing, editable handles, persistence |
| F07 | UI-02 Text `33→7`, Counter `68→7`; UI-03 `editorSetText:` source `370`, `editorSetCorrection:` source `383` | Counter increment/reset, typography, meaning of correction modes |
| F08 | UI-02 Magnifier `48→7`, Highlighter `53→7`, Spotlight `63→7` | Compositing, magnification and editable effect parameters |
| F09 | UI-03 labels Blur/Blur Text/Erase/Erase Text coexist with `editorSetConcealType:` from segmented control `302→659` | Label-to-segment index mapping is not resolved; text detection, fill/blur algorithms and concealment efficacy unknown |
| F10 | UI-03 size `249`, line type `257`, arrow type `271`, arrow style `292`, fill `336`, shape `357`, transparency `394` | Shape/style catalog, units and effective settings |
| F11 | UI-03 Crop `83→488`, selection action `93→488`; UI-02 Reset Crop `231→7`; UI-03 Cut Out/Reset Selection labels | Selection subaction indices, crop restoration and destructive effects |
| F12 | UI-03 width `168→659`, height `193→659`, Resize `204→659`; Autoadjust label; Resize Image and cannot-be-undone warning | Aspect ratio, resampling, actual undo scope and automatic adjustment |
| F13 | UI-02 Undo/Redo `221/226` have null targets; Rasterize `235→7` | Undo stack ownership and rasterization output |
| F14 | UI-02 Add Capture `83→7`, Snap to Objects `88→7`, Snap to Similar Objects `92→7` | Object detection, similarity criteria, alignment and multi-image model |
| F15 | UI-02 zoom actions; UI-03 zoom-box `577→488`, zoom buttons `969/988/1009→659` | Effective scale, interpolation, selection/viewport coordinate behavior |
| F16 | UI-03 PX/PT labels, `editorSetRulerPixels:` `323→659`, size-box `595→488`, `changeRealPixels:` `928→659` | Logical/physical mapping on actual displays; do not generalize the bundled 2x Retina help to every screen |
| F17 | UI-03 color-box `519→488`, `changeColorFormat:` `788→659`; pixel/text/average-color help and keyboard hints | Popup formats are not populated by this observation; actual sampling and clipboard values unknown |
| F18 | UI-05 padding `83`, shadow `113`, inset `139`, outer/inner radius `170/186`, aspect `12` and Recenter `144`, all `→471` | Layout equations, output crop and receiver implementation |
| F19 | UI-05 mode `205`, gradient endpoints `251/272`, gradient type `300`, randomize/reverse `324/337`, image blur `374` | Gradient generation, image selection and rendering; generic Button labels are not meaningful product captions |

## Details that change interpretation

1. **Shortcut declarations are not effective bindings.** UI-02 archives keys `a/t/r/d/m/h/b/s/c/o/l` for the drawing tools. These are raw `NSKeyEquiv` strings; no missing modifier mask is invented. A `c` declaration for Counter and a separate help hint about copying average color may be context-dependent, which is **INFERRED**, not tested.
2. **Serialized slider values are not pixel units or current preferences.** UI-03 size cell declares range `0..7`, value `2`. UI-05 padding/shadow/inset/radii cells declare `0..20`; image blur `0..7`. These do not prove a seven-pixel stroke limit, a twenty-pixel radius limit or runtime defaults.
3. **Selector wording can mislead.** UI-05 source `144` has the displayed text Recenter but action `clickAutocrop:`. Source `417` has text Remove but action `clickReset:`. Neither should be advertised as an additional distinct auto-crop/reset feature solely from the handler name.
4. `editorGIF:` from `403→659` remains an ambiguous action. No screen recording or GIF encoder has been established.

## Native trace attempt

REA 6.8.0 `trace-native-ui-action /Applications/Shottr.app editorSetConcealType: --format json` returned exit code 1 and `provider_unavailable`. The diagnostic rejects the auto-selected Ghidra/Hopper/IDA/Kuna candidates; it also notes that its Ghidra route cannot select an architecture directly from this universal Mach-O and would need a thinned artifact. No repeated attempt, provider installation, target modification or decompilation was performed.

The error is preserved in `evidence/raw/codex/T03-trace-conceal.json` and summarized in [trace-attempt.json](../../../evidence/agents/codex/T03-trace-attempt.json). An error diagnostic is not successful REA Evidence. The observed compiled action remains valid; its implementation is **UNKNOWN**. Native UI tooling is a different route and is not ruled out by this provider error.

## Prepared runtime checks

[Fixture manifest](../../../evidence/agents/codex/T03-fixture.json) describes a generated 640×400 RGB PNG with four known color probes and synthetic text. Image: `captures/T03/synthetic-editor.png`, ignored by Git. It contains no desktop capture and has not been opened in Shottr. Reproduce with `rtk proxy python3 scripts/create_editor_fixture.py`.

| Check | Procedure once the UI claim is available | Evidence to retain |
| --- | --- | --- |
| E01 | Open the fixture; draw/edit each primitive, text and three counters | Window-scoped captures, selected tools, actual counter values |
| E02 | Apply each concealment mode to synthetic text and a colored patch | Before/after local output, mode choice, pixel comparisons; no privacy guarantee |
| E03 | Crop a known rectangle, reset crop, resize, attempt undo and rasterize | Original/output dimensions, control state and undo results |
| E04 | Add a second fixture and test both snap modes | Relative positions and a bounded observed snap threshold |
| E05 | Measure known dimensions at multiple zooms and PX/PT modes | Display scale, image/selection coordinates and returned measurements |
| E06 | Sample the four manifest probes, text color and a uniform average region | Chosen format, actual output value and color-management context |
| E07 | Apply backdrop presets, padding/radii, Recenter/Remove and gradient/image modes | Settings and output pixel dimensions; source image unchanged |

No E01-E07 check was executed. Runtime ownership and existing content must be checked before any UI action. No settings, clipboard, license, user images or network endpoints were accessed by this pass.
