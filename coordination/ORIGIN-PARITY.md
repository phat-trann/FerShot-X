# Original baseline and functional parity

Reference: **Shottr 1.9.3, build 137**, macOS minimum 12; [identity and original Evidence IDs](../evidence/target.json). The executable and Info.plist hashes were rechecked against installed files on 2026-11-05 and matched. This was an ordinary shell SHA-256 check, not a new REA analysis or runtime observation.

Executable SHA-256: `4a1ea879e1079b81b1c501e7ef0c399cf7d0890c2b33fc79f97c4124620360a3`.
Info.plist SHA-256: `6d33bc838b1588405f797c6f918e238eaab3148f5b32c5ddbc65d5ae9b6fb9c5`.

## What is established

The initial packaged-resource inventory contains 34 feature groups. All 34 map to an owner or explicit exclusion below. This demonstrates traceable planning against the observed inventory; it does not establish exhaustive discovery, native behavior, visual similarity or functional parity. UI labels/actions and framework imports do not prove execution. The original runtime questions remain open; synthetic Ferby tests and successful builds cannot answer them.

**MVP accepted progress remains 61.25%. Full Shottr functional parity is not certified and has no defensible completion percentage yet.** Do not use feature-group coverage, task counts or case counts as a parity percentage. Delegating these tasks earns no accepted gate. Retain the original MVP denominator in [PROGRESS.md](PROGRESS.md).

## Traceable coverage

Source affordances and exact UI document references: [static inventory](../docs/phase-1-features.md) and [UI inventory](../docs/ui-inventory.md). All non-excluded rows below remain STATIC_OBSERVED for the original and UNKNOWN for original-vs-Ferby runtime equivalence. The producer/integration tasks are a work plan, not an implementation-status assertion.

| Feature | Source group | Original resource reference | Implementation / integration owners | Comparison owner | Parity status |
| --- | --- | --- | --- | --- | --- |
| F01 | Screen capture modes | [UI-10](../docs/ui-inventory.md#ui-10) shortcut labels | C02/C11; A25/P34 | P43 | UNKNOWN |
| F02 | Scrolling screenshots | [UI-10](../docs/ui-inventory.md#ui-10), [UI-12](../docs/ui-inventory.md#ui-12), [UI-15](../docs/ui-inventory.md#ui-15) | A22/A23/P30/C11 | P43 | UNKNOWN |
| F03 | Text and QR recognition | [UI-03](../docs/ui-inventory.md#ui-03), [UI-10](../docs/ui-inventory.md#ui-10), [UI-16](../docs/ui-inventory.md#ui-16) | A11/A12/A33/P23/P24/C08 | P44 | UNKNOWN |
| F04 | OCR preferences | [UI-12](../docs/ui-inventory.md#ui-12) | A11/P21/P23/C08/C10 | P44 | UNKNOWN |
| F05 | Import existing images | [UI-02](../docs/ui-inventory.md#ui-02), E-PLIST | A14/P35/C08; current import | P44 | UNKNOWN |
| F06 | Basic annotations | [UI-02](../docs/ui-inventory.md#ui-02) labels and `menu*:` actions | A04/A06/A07/A08/A16/A32/P25/P26/C07/C12 | P45 | UNKNOWN |
| F07 | Text and numbered markers | [UI-02](../docs/ui-inventory.md#ui-02), [UI-03](../docs/ui-inventory.md#ui-03) | A17/P27/P33/C01/C12 | P45 | UNKNOWN |
| F08 | Emphasis | [UI-02](../docs/ui-inventory.md#ui-02) | A18/C12 | P46 | UNKNOWN |
| F09 | Concealment and erasing | [UI-03](../docs/ui-inventory.md#ui-03) | A19/C12 | P46 | UNKNOWN |
| F10 | Annotation styling | [UI-03](../docs/ui-inventory.md#ui-03) | A16/A17/A18/P28/C12 | P45 | UNKNOWN |
| F11 | Crop and selection | [UI-02](../docs/ui-inventory.md#ui-02), [UI-03](../docs/ui-inventory.md#ui-03) | C03/A32/P25/P26/C07/C12 | P45 | UNKNOWN |
| F12 | Image resize and automatic adjustment | [UI-03](../docs/ui-inventory.md#ui-03) | C03/A31/C12 | P46 | UNKNOWN |
| F13 | Undo/redo and merge | [UI-02](../docs/ui-inventory.md#ui-02) | C01/P09/A07/A08/C07 | P45 | UNKNOWN |
| F14 | Composition and snapping | [UI-02](../docs/ui-inventory.md#ui-02) | A21/P29/C12 | P47 | UNKNOWN |
| F15 | Zoom and navigation | [UI-02](../docs/ui-inventory.md#ui-02), [UI-03](../docs/ui-inventory.md#ui-03), [UI-12](../docs/ui-inventory.md#ui-12) | P06/P14/A32/C07 | P45 | UNKNOWN |
| F16 | Pixel/point measurement | [UI-03](../docs/ui-inventory.md#ui-03) | P02/A27/C12 | P46 | UNKNOWN |
| F17 | Color inspection | [UI-03](../docs/ui-inventory.md#ui-03) | P01/P13/P14/P32/C04/C08 | P46 | UNKNOWN |
| F18 | Backdrop composition | [UI-05](../docs/ui-inventory.md#ui-05), [T03](../docs/agents/codex/T03-editor.md) | A20/P31/C12 | P47 | UNKNOWN |
| F19 | Background styles | [UI-05](../docs/ui-inventory.md#ui-05) | A20/C12 | P47 | UNKNOWN |
| F20 | Pin image on screen | [UI-02](../docs/ui-inventory.md#ui-02), [UI-09](../docs/ui-inventory.md#ui-09) | A05/P10/C09 | P48 | UNKNOWN |
| F21 | Screenshot library interface | [UI-07](../docs/ui-inventory.md#ui-07) | A02/A29/P17/P19/C14 | P48 | UNKNOWN |
| F22 | Preview thumbnail | [UI-16](../docs/ui-inventory.md#ui-16) | A15/P39/C09 | P48 | UNKNOWN |
| F23 | Post-capture automation | [UI-15](../docs/ui-inventory.md#ui-15) | A24/P34/C10 | P49 | UNKNOWN |
| F24 | Local output | [UI-02](../docs/ui-inventory.md#ui-02), [UI-03](../docs/ui-inventory.md#ui-03) | C06/A30/P38/P40/C08/C15 | P49 | UNKNOWN |
| F25 | Output preferences | [UI-15](../docs/ui-inventory.md#ui-15) | A03/A09/A10/P08/P20/P36/C10 | P49 | UNKNOWN |
| F26 | Window-capture appearance | [UI-15](../docs/ui-inventory.md#ui-15) | A26/C11/C12 | P47 | UNKNOWN |
| F27 | Shottr Cloud sharing | [UI-02](../docs/ui-inventory.md#ui-02), [UI-13](../docs/ui-inventory.md#ui-13) | EXCLUDED | P50 | DELIBERATE_EXCLUSION |
| F28 | S3-compatible sharing | [UI-13](../docs/ui-inventory.md#ui-13) | EXCLUDED | P50 | DELIBERATE_EXCLUSION |
| F29 | Share URL options | [UI-13](../docs/ui-inventory.md#ui-13) | EXCLUDED | P50 | DELIBERATE_EXCLUSION |
| F30 | Global shortcuts | [UI-10](../docs/ui-inventory.md#ui-10) | A25/C13 | P50 | UNKNOWN |
| F31 | App/window preferences | [UI-12](../docs/ui-inventory.md#ui-12), [UI-15](../docs/ui-inventory.md#ui-15) | A28/C10/C13 | P50 | UNKNOWN |
| F32 | Deep links | E-PLIST, [UI-12](../docs/ui-inventory.md#ui-12) | P37/C15 | P50 | UNKNOWN |
| F33 | License and onboarding | [UI-04](../docs/ui-inventory.md#ui-04), [UI-14](../docs/ui-inventory.md#ui-14) | EXCLUDED license gates; A25/A28 for own setup | P50 | DELIBERATE_EXCLUSION |
| F34 | Diagnostics preference | [UI-12](../docs/ui-inventory.md#ui-12) | EXCLUDED; C16 verifies absence | P50 | DELIBERATE_EXCLUSION |

## Known differences and unresolved comparisons

- Ferby uses Rust/Tauri and React; the original is a native AppKit application with Swift imports. Matching functions does not require copying implementation languages. No Swift code, compiler or runtime helper is permitted in Ferby. A33 replaces A13; historical Swift files remain reference-only.
- Cloud/S3/share URLs, licensing nags and telemetry are deliberately excluded from Ferby; FTP is deferred. Never alter Shottr licensing or preferences, copy its code/resources, or claim complete product identity.
- Ferby currently uses explicit image-coordinate geometry, bounded history and safe non-overwriting export policies. Source-default history limits, filename collision rules, output Auto format, color algorithms, snapping and image-adjustment semantics remain unverified.
- Pin image opacity currently affects the image within an opaque native window; whole-window translucency has not been demonstrated. Session library, persisted archive and native lifecycle behavior require separate acceptance.
- Existing source-backed APIs may be unreviewed, unwired or only partially integrated. C07-C15 packets and current code establish Ferby status; old FUNCTION-MAP remaining-boundary prose is not a live integration dashboard.
- Accessibility/Screen Recording blocked earlier original UI observation. Do not silently change OS permissions or treat that historical blocker as a successful comparison. Use existing static evidence now and save concrete runtime cases for an authorized available UI slot.

## Case-pack contract for P43-P50

Each `docs/qa/parity/Pxx.json` is an object with `task`, `baseline` (version, build, executable_sha256), and `cases`. Each case contains: `id`, `feature_id`, `source_reference`, `source_evidence_level`, `fixture`, `trigger`, `target_observation_needed`, `ferby_observation_needed`, `expected_target_result`, `acceptance_rule`, `target_status`, `ferby_status`, `owner`, `limitations`.

Use unique case IDs prefixed by the task ID; assigned feature IDs only; 3-6 cases per pack. `source_evidence_level` is `STATIC_OBSERVED`. `expected_target_result` remains JSON null. `target_status` is `NOT_EXECUTED` or `EXCLUDED`, and `ferby_status` is `NOT_EXECUTED`. An exclusion needs a rationale and no execution. Conditional acceptance rules describe what to compare after recording the original, not a fabricated original outcome. Validate JSON and required fields with standard Python; no new test framework or schema package is needed. The short Markdown report identifies gaps and stays within 150 words.

## Acceptance process

1. Retain version/build/hash plus resource path/node/selector references for source claims. Use scoped REA evidence when a new packaged-app claim needs investigation.
2. Write explicit same-input comparison cases, including cancellation/failure and output pixels where relevant. Preserve synthetic fixtures and provenance; never name a Ferby-generated image a Shottr golden.
3. Only one original UI operator at a time, under `runtime-shottr`, within current privacy boundaries. Missing permission leaves the case NOT_EXECUTED. Static-only workers continue independently.
4. Record original and Ferby observations separately with artifact hashes and exact operations. Only runtime observation justifies RUNTIME_VERIFIED; inferred behavior stays INFERRED.
5. Codex reviews actual modules, comparison evidence and accepted deviations before marking a case matched or accepting a progress gate. A mismatch becomes a bounded correction task for its producer; root adapters/builds remain Codex-owned.

## Current integration facts

The latest Codex packets report partial integrations for basic editor/raster output (C07), explicit clipboard import (C08), restricted pins (C09), and format/quality persistence (C10). They do not certify equivalent original runtime behavior. A33 has a fresh worker submission awaiting actual code/evidence review; no OCR parity is credited here. Native manual acceptance and broader C11-C15 integration remain separate open gates.

## C42 focused static follow-up (2026-11-06)

[Region coordinate follow-up](../docs/agents/codex/C42-shottr-comparison.md) reads the actual RegionSelector mouse-up wrapper and its called body in hash-matched Shottr 1.9.3 (137). Rectangle coordinate operations and four FRINTA instructions are STATIC_OBSERVED; callback consumer, Retina/multi-display equivalence and original runtime behavior remain UNKNOWN. Ferby synthetic regressions do not change the runtime comparison gates.
