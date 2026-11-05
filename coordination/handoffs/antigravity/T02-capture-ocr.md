# T02 handoff

Agent: Antigravity
Status: DONE
Updated: 2026-11-05T09:06:30+07:00
Owned files: `docs/agents/antigravity/T02-capture-ocr.md`, `coordination/handoffs/antigravity/T02-capture-ocr.md`, `coordination/messages/codex/20261105T090630+0700-antigravity-T02.md`, `captures/T02/fixtures/`, `evidence/raw/t02-demangle-swift.json`, `evidence/raw/t02-observe-editor.json`, `evidence/raw/t02-observe-editor-ax.json`

## Findings

- Target `/Applications/Shottr.app` (`cc.ffitch.shottr` 1.9.3 build 137, executable SHA-256 `4a1ea879e1079b81b1c501e7ef0c399cf7d0890c2b33fc79f97c4124620360a3`, `Info.plist` SHA-256 `6d33bc838b1588405f797c6f918e238eaab3148f5b32c5ddbc65d5ae9b6fb9c5`).
- **F01 (Screen capture modes)**: `STATIC_OBSERVED` in `UI-10` (`6sQ-om-XCe-view-qXZ-XU-bNz.nib`, SHA-256 `612e1d4c546d55d52d74a03b19fb72938bdffd085c0ef329c483f7abbc2c2b37`, `ev_7a54c59efe5ad259d8b8b7c187965d29df9ca99f3686ffa068c92add599df2ca`) and `UI-15` (`vXi-bH-nTd-view-fki-md-Men.nib`, SHA-256 `8aa20a6fba6c453e9e02f47a6c5683f7c15293c3d76e1e7ec94bde02f2dc5e29`); Mach-O (`ev_325b2de5ec4707dfddd3ebd3c0886f97143495651e250254894ce3e29af0863f`) imports CoreGraphics `_CGPreflightScreenCaptureAccess`, `_CGRequestScreenCaptureAccess`, `_CGWindowListCopyWindowInfo`, `_CGWindowListCreateImage` and weak-linked `ScreenCaptureKit` (`_OBJC_CLASS_$_SCScreenshotManager`, `_OBJC_CLASS_$_SCShareableContent`, `_OBJC_CLASS_$_SCDisplay`, `_OBJC_CLASS_$_SCWindow`). Dual-API capture plumbing is `INFERRED`; runtime behavior is `UNKNOWN` (blocked by OS permissions).
- **F02 (Scrolling screenshots)**: `STATIC_OBSERVED` in `UI-10` (`object:["150"]`), `UI-12` (`NTL-U4-RCY-view-jEA-Ft-qg2.nib`, SHA-256 `7e5bef014e15e3c2af1708bb53703394e887aeff233d0d3abb527047ef8d2665`, `updateReverseAutoscroll:`), and `UI-15` (`updateScrollingMax:`, `updateScrollingSpeed:`); Mach-O (`ev_325b2de5ec4707dfddd3ebd3c0886f97143495651e250254894ce3e29af0863f`) imports `_CGEventCreateScrollWheelEvent2` and Vision `_OBJC_CLASS_$_VNTranslationalImageRegistrationRequest`, `_OBJC_CLASS_$_VNImageTranslationAlignmentObservation`. Event synthesis and translational alignment stitching are `INFERRED`; runtime behavior is `UNKNOWN` (blocked).
- **F03 (Text and QR recognition)**: `STATIC_OBSERVED` in `UI-03` (`NSWindowController-B8D-0N-5wS.nib`, SHA-256 `3cf372b4c468bafaad79e90055413aa57721b013668f3cb1c1b00587757c2842`, `object:["116"]` "Recognize Text or QR (⌘O)", `scSelectionClick:`), `UI-10` (`object:["170"]` "Instant Text/QR Recognition"), and `UI-16` (`NJi-sV-KQJ-view-bhd-SB-Gtf.nib`, SHA-256 `9e2b908f96838ad4f3205cb712a08af1d7cb2186e976c83ff05108847a5ffba5`, `clickOCR:`). Mach-O (`ev_325b2de5ec4707dfddd3ebd3c0886f97143495651e250254894ce3e29af0863f`) imports Vision (`VNRecognizeTextRequest`, `VNRecognizedTextObservation`) and CoreImage (`_CIDetectorTypeQRCode`, `_OBJC_CLASS_$_CIQRCodeFeature`). REA `demangle-swift` (`ev_b0a059ea2fd47ee5ac2bf7c1c8cc809e24f3a15261d362a3a1f3994b005ffc08`, `evidence/raw/t02-demangle-swift.json`) confirms `(extension in Vision):__C.VNRecognizedText.boundingBox(for: Swift.Range<Swift.String.Index>) throws -> __C.VNRectangleObservation?`. Separate Vision OCR vs. CoreImage QR detection is `INFERRED`; runtime accuracy and output destination remain `UNKNOWN` (blocked).
- **F04 (OCR preferences)**: `STATIC_OBSERVED` in `UI-12` (`object:["14"]` "Primary OCR language", `object:["32"]`/`["36"]` "English", `object:["51"]` "OCR line breaks", `object:["57"]` "Remove line breaks", `updatePrimaryOCR:`, `updateRemoveBreaksOCR:`). Runtime language list and formatting rules remain `UNKNOWN`.
- Report path: `docs/agents/antigravity/T02-capture-ocr.md`.

## Validation and limitations

- Synthetic fixtures prepared in `captures/T02/fixtures/synthetic-ocr-qr.png` (SHA-256 `f9e1241be7a2d2019182e0c535c4d2ae582a0e6f852084f57979245d607e526f`) and `captures/T02/fixtures/synthetic-scroll.txt` (SHA-256 `761ed5ca18b17085bdc6a9205e6d494161a7af99ef25dd286ccdfd0e30633ee7`).
- Acquired `runtime-shottr`, opened `synthetic-ocr-qr.png` in existing Shottr process (PID `2022`, window `108`), and ran REA `observe-native-ui`. Both screenshot+AX and AX-only (`--no-screenshot`) calls returned `capability_unavailable` (`screen-recording-denied` in `evidence/raw/t02-observe-editor.json` and `accessibility-denied` in `evidence/raw/t02-observe-editor-ax.json`).
- Restored PID `2022` to 0 onscreen windows via `NSRunningApplication.hide()`, released `runtime-shottr`, and did not read private screenshots or modify user preferences.
- `UI-12` has `hierarchy_complete: false`; IB connection coverage is partial across 8 archives.

## Next action

- **Recipient**: Codex (integrator, T06).
- **Concrete question**: Should F01–F03 native symbol pairings (`ScreenCaptureKit`/`CGWindowListCreateImage`, `_CGEventCreateScrollWheelEvent2`/`VNTranslationalImageRegistrationRequest`, and `VNRecognizeTextRequest`/`CIDetectorTypeQRCode`) be merged into `docs/phase-1-features.md` as `STATIC_OBSERVED` imports + `INFERRED` implementation hypotheses while keeping runtime status `UNKNOWN` (blocked on macOS Screen Recording & Accessibility permissions for the REA host)?
- **Prerequisites**: Grant Screen Recording and Accessibility permissions to the REA host if interactive `RUNTIME_VERIFIED` status is later requested.
