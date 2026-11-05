# T02: Screen Capture, Scrolling Screenshots, OCR and QR Verification

- **Agent**: Antigravity
- **Target**: `/Applications/Shottr.app`, bundle ID `cc.ffitch.shottr`, version **1.9.3**, build **137**
- **Executable SHA-256**: `4a1ea879e1079b81b1c501e7ef0c399cf7d0890c2b33fc79f97c4124620360a3` (`arm64` slice in universal Mach-O, UUID `D80F2EC3-409A-3686-87A6-F0F6954FDAA1`)
- **Info.plist SHA-256**: `6d33bc838b1588405f797c6f918e238eaab3148f5b32c5ddbc65d5ae9b6fb9c5`

## Result Table (F01–F04)

| ID | Feature Group | Status | Static Evidence (REA) | Runtime & Inference Status |
| --- | --- | --- | --- | --- |
| F01 | Screen capture modes | `STATIC_OBSERVED`; runtime `UNKNOWN` (blocked) | `UI-10` (`6sQ-om-XCe-view-qXZ-XU-bNz.nib`, SHA-256 `612e1d4c546d55d52d74a03b19fb72938bdffd085c0ef329c483f7abbc2c2b37`, `ev_7a54c59efe5ad259d8b8b7c187965d29df9ca99f3686ffa068c92add599df2ca`): labels `object:["123"]` ("Fullscreen screenshot"), `object:["132"]` ("Area screenshot"), `object:["141"]` ("Active window screenshot"), `object:["184"]` ("Repeat area screenshot"), `object:["188"]` ("Any window screenshot"). `UI-15` (`vXi-bH-nTd-view-fki-md-Men.nib`, SHA-256 `8aa20a6fba6c453e9e02f47a6c5683f7c15293c3d76e1e7ec94bde02f2dc5e29`): post-capture actions `changeAreaCropBehavior:` (`303:connection:0`, `316:connection:0`), `updateAfterGrabShow:` (`321:connection:0`), `updateAfterGrabCopy:` (`326:connection:0`), `updateAfterGrabSave:` (`331:connection:0`). Mach-O (`ev_325b2de5ec4707dfddd3ebd3c0886f97143495651e250254894ce3e29af0863f`) imports CoreGraphics `_CGPreflightScreenCaptureAccess`, `_CGRequestScreenCaptureAccess`, `_CGWindowListCopyWindowInfo`, `_CGWindowListCreateImage` and weak-linked `ScreenCaptureKit` classes (`_OBJC_CLASS_$_SCShareableContent`, `_OBJC_CLASS_$_SCDisplay`, `_OBJC_CLASS_$_SCWindow`, `_OBJC_CLASS_$_SCScreenshotManager`). | `INFERRED`: dual CoreGraphics / weak `ScreenCaptureKit` capture plumbing. `UNKNOWN` at runtime: mode selection, window targeting, and output pixels could not be `RUNTIME_VERIFIED` because macOS denied REA `observe-native-ui` both Screen Recording (`screen-recording-denied`) and Accessibility (`accessibility-denied`). |
| F02 | Scrolling screenshots | `STATIC_OBSERVED`; runtime `UNKNOWN` (blocked) | `UI-10` label `object:["150"]` ("Scrolling screenshot"). `UI-12` (`NTL-U4-RCY-view-jEA-Ft-qg2.nib`, SHA-256 `7e5bef014e15e3c2af1708bb53703394e887aeff233d0d3abb527047ef8d2665`): labels `object:["134"]` ("Scrolling capture"), `object:["141"]` ("Reverse scroll direction"); actions `updateReverseAutoscroll:` (`138:connection:0`), `helpReverseAutoscroll:` (`142:connection:0`). `UI-15`: labels `object:["263"]` ("Scrolling screenshot max height"), `object:["274"]` ("Scrolling screenshot speed"); actions `updateScrollingMax:` (`212:connection:0`), `updateScrollingSpeed:` (`269:connection:0`). Mach-O (`ev_325b2de5ec4707dfddd3ebd3c0886f97143495651e250254894ce3e29af0863f`) imports `_CGEventCreateScrollWheelEvent2` and Vision `_OBJC_CLASS_$_VNTranslationalImageRegistrationRequest`, `_OBJC_CLASS_$_VNImageTranslationAlignmentObservation`. | `INFERRED`: synthetic scroll wheel events and translational image registration may support autoscroll and frame stitching, though import presence does not prove runtime call paths. `UNKNOWN` at runtime: stitching quality, max height enforcement, speed steps, and stopping behavior (blocked by Screen Recording / Accessibility denial). |
| F03 | Text and QR recognition | `STATIC_OBSERVED`; runtime `UNKNOWN` (blocked) | `UI-03` (`NSWindowController-B8D-0N-5wS.nib`, SHA-256 `3cf372b4c468bafaad79e90055413aa57721b013668f3cb1c1b00587757c2842`): tooltip `object:["116"]` ("Recognize Text or QR (⌘O)"), segmented control action `scSelectionClick:` (`93:connection:0`). `UI-10`: label `object:["170"]` ("Instant Text/QR Recognition"). `UI-16` (`NJi-sV-KQJ-view-bhd-SB-Gtf.nib`, SHA-256 `9e2b908f96838ad4f3205cb712a08af1d7cb2186e976c83ff05108847a5ffba5`): preview action `clickOCR:` (`57:connection:0`). Mach-O (`ev_325b2de5ec4707dfddd3ebd3c0886f97143495651e250254894ce3e29af0863f`) imports Vision `_OBJC_CLASS_$_VNImageRequestHandler`, `_OBJC_CLASS_$_VNRecognizeTextRequest`, `_OBJC_CLASS_$_VNRecognizedText`, `_OBJC_CLASS_$_VNRecognizedTextObservation`, `_VNImageRectForNormalizedRect`, and CoreImage `_CIDetectorTypeQRCode`, `_OBJC_CLASS_$_CIQRCodeFeature`. REA `demangle-swift` (`ev_b0a059ea2fd47ee5ac2bf7c1c8cc809e24f3a15261d362a3a1f3994b005ffc08`) demangles `_$sSo16VNRecognizedTextC6VisionE11boundingBox3forSo22VNRectangleObservationCSgSnySS5IndexVG_tKF` to `(extension in Vision):__C.VNRecognizedText.boundingBox(for: Swift.Range<Swift.String.Index>) throws -> __C.VNRectangleObservation?`. | `INFERRED`: text recognition uses `Vision` (`VNRecognizeTextRequest`) while QR detection uses `CoreImage` (`CIDetectorTypeQRCode` / `CIQRCodeFeature`; no `VNDetectBarcodesRequest` symbol was observed in dynamic imports). `UNKNOWN` at runtime: OCR accuracy, QR payload handling, and clipboard/UI output destination (blocked by permission denial). |
| F04 | OCR preferences | `STATIC_OBSERVED`; runtime `UNKNOWN` (blocked) | `UI-12` (`NTL-U4-RCY-view-jEA-Ft-qg2.nib`, SHA-256 `7e5bef014e15e3c2af1708bb53703394e887aeff233d0d3abb527047ef8d2665`): labels `object:["14"]` ("Primary OCR language"), `object:["32"]` / `object:["36"]` ("English"), `object:["51"]` ("OCR line breaks"), `object:["57"]` ("Remove line breaks"); actions `updatePrimaryOCR:` (`27:connection:0`), `updateRemoveBreaksOCR:` (`53:connection:0`). Note: `UI-12` has `hierarchy_complete: false` (176 objects, 31 connections). | `UNKNOWN` at runtime: full list of runtime-populated OCR languages (only default "English" is archived in `UI-12`) and exact line-break joining rules. User preferences were not modified per boundary rules. |

## Synthetic Fixtures and Runtime Blocker

1. **Synthetic fixtures created (ordinary shell/Swift generation, Git-ignored)**:
   - `captures/T02/fixtures/synthetic-ocr-qr.png` (SHA-256: `f9e1241be7a2d2019182e0c535c4d2ae582a0e6f852084f57979245d607e526f`): 800×500 PNG with 3 lines of monospace text (`SHOTTR_T02_OCR_LINE_1`, `SHOTTR_T02_OCR_LINE_2`, `SYNTHETIC_FIXTURE_98765`) and a QR code (`https://example.com/shottr-t02-qr`).
   - `captures/T02/fixtures/synthetic-scroll.txt` (SHA-256: `761ed5ca18b17085bdc6a9205e6d494161a7af99ef25dd286ccdfd0e30633ee7`): 60-line scrollable text fixture.
2. **Ordinary shell/CoreGraphics window observation (non-REA)**:
   - Existing process `/Applications/Shottr.app/Contents/MacOS/Shottr` (PID `2022`) had 0 onscreen windows before testing.
   - Opening `captures/T02/fixtures/synthetic-ocr-qr.png` brought window `108` (`1536×916`) onscreen with the synthetic fixture.
3. **REA runtime UI blocker**:
   - `observe-native-ui /Applications/Shottr.app --pid 2022 --windowId 108` failed with `capability_unavailable` / `screen-recording-denied` (`evidence/raw/t02-observe-editor.json`).
   - `observe-native-ui /Applications/Shottr.app --pid 2022 --windowId 108 --no-screenshot` failed with `capability_unavailable` / `accessibility-denied` (`evidence/raw/t02-observe-editor-ax.json`).
   - After testing, `NSRunningApplication(processIdentifier: 2022)?.hide()` restored onscreen window count for PID `2022` to `0`, and `runtime-shottr` was released.

## Evidence Paths and Limitations

- **REA Static Evidence**:
  - `evidence/target.json` (`ev_873e89b3dfe28175d06beecfaef6a625b85d61fd7e7f79c50888494f39633abd`, `ev_7a54c59efe5ad259d8b8b7c187965d29df9ca99f3686ffa068c92add599df2ca`, `ev_325b2de5ec4707dfddd3ebd3c0886f97143495651e250254894ce3e29af0863f`)
  - `evidence/ui-signals.json` and `docs/ui-inventory.md` (`UI-03`, `UI-10`, `UI-12`, `UI-15`, `UI-16`)
  - `evidence/raw/t02-demangle-swift.json` (`ev_b0a059ea2fd47ee5ac2bf7c1c8cc809e24f3a15261d362a3a1f3994b005ffc08`, SHA-256 `7962125346b8cbb0443e4da7798194ddb602e75a90bca1edf3c803dff20910b3`)
- **REA Runtime Error Records (Git-ignored `evidence/raw/`)**:
  - `evidence/raw/t02-observe-editor.json` (SHA-256 `f7d5783ebd43c5fbf4d0059f848108eaab6b64b26bfd2515eac3beb80905a1b4`)
  - `evidence/raw/t02-observe-editor-ax.json` (SHA-256 `9908fbf78dd4f8f6cac98ce1edb26f95db95eae541bdacdb33c3922a6c53d16b`)
- **Limitations**: Interface Builder decoding has partial connection coverage (8 documents) and incomplete hierarchy in `UI-12` (`hierarchy_complete: false`). Stripped/internal native symbols are absent from `inspect-macho`. No feature in F01–F04 is `RUNTIME_VERIFIED`.

## Remaining Questions

1. Once Screen Recording and Accessibility permissions are granted to the REA host, how do `scSelectionClick:` (`UI-03`) and `clickOCR:` (`UI-16`) format multi-line OCR vs. QR payloads on `captures/T02/fixtures/synthetic-ocr-qr.png`?
2. Which runtime condition selects `ScreenCaptureKit` (`SCScreenshotManager`) vs. `CGWindowListCreateImage` in F01/F02?
3. What candidate languages populate `updatePrimaryOCR:` (`UI-12` `object:["27:connection:0"]`) at runtime?
