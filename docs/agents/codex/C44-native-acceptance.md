# C44 controlled native acceptance

MVP acceptance **68.75% → 85.00%**. Seven previously-open gates now have actual native application evidence rather than only mocks. No original Shottr runtime parity or absence-of-bugs guarantee is implied.

## Executed evidence

The actual production React application ran in WKWebView, with real registered IPC handlers, Rust image codecs, Vision and owned native windows. The explicit test feature isolates its application identifier and configuration. Three fresh processes passed in sequence; final run identifier: `dev.ferby.shottr.acceptance.c44-1793962362076447000`.

- Phase 1: import real synthetic PNG; apply crop through the actual React form; show returned native 60×50 image; retain the source; add a highlight; Save twice through production handlers to a private configured destination. Rust independently decoded both actual 100×80 PNG files and verified annotated pixel `[255,255,128,255]`, distinct non-clobber filenames `Acceptance.png` and `Acceptance-1.png`.
- Native pin: actual child rendered the owned raster, scale input produced 200px width, image opacity became 0.5, main-only preference commands were rejected, and the child closed itself. Native window API confirmed always-on-top. Clipboard was not touched.
- OCR: actual runtime language discovery; malformed encoded input returned a structured native error; actual Vision recognized synthetic FERBY text and the actual OCR panel displayed it. No clipboard write.
- Phase 2: a second actual process reloaded quality 73 into both GUI and native preference reads.
- Phase 3: the harness corrupted only its own two preference files, then a third actual process showed defaults, reported failure and preserved exact corrupt bytes.

Final raw evidence: `artifacts/C44-native-summary.json`, its three uniquely named phase reports, `artifacts/C44-native-inputs-final.json` (final tested binary and source hashes), and `artifacts/C44-fixture-index.json`. Final fixtures are archived beneath `artifacts/C44-native-fixtures/`; their original config paths are historical locations. Only these uniquely owned test configuration directories were removed after evidence archival. No personal Ferby/Shottr settings were read or modified.

## Accepted gates

| Milestone | Gate | Earned |
| --- | --- | --- |
| Editor | Annotated export end-to-end | 5.00% |
| Transform | Native GUI transform | 2.50% |
| Export | Annotated-pixel export | 2.50% |
| Settings | Native integration and preference application | 1.25% |
| Settings | Restart / invalid-settings | 1.25% |
| Pin | Native pin | 1.25% |
| OCR | Native acceptance and failure handling | 2.50% |

The export evidence covers the configured private folder route, not the system Save dialog. Pin transparency evidence concerns the image inside its window, not whole-window translucency. OCR uses synthetic input, not captured user content. Gate acceptance is bounded to these declared Ferby behaviors.

Actual regression: 478 frontend tests, 51 browser tests, 24 root Rust tests, 67 tests across twelve standalone crates (**620 executed tests passed**), plus the separate three-process native sequence. One Vision documentation example remains ignored; some OS-bound crates contain no tests. TypeScript/Vite and explicit feature build succeeded. Ordinary app/release build is performed separately in C45 with this feature disabled. Formatting/lint delegated to H01.

## Remaining gates

Real capture modes/cancel (3.75%), permission/error/window restoration (3.75%), system Save dialog/existing-file acceptance (2.5%), full native manual matrix (2.5%), and release build/signing/distribution decision (2.5%) remain open at this checkpoint. Read-only host preflight returned Accessibility=false and Screen Recording=false for the validation process, not Ferby's own app permission identity. No permission prompt or settings change occurred. C45 addresses the local release decision; manual capture and dialog evidence cannot be inferred from this harness.
