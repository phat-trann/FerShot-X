# C45 local release decision

The release scope is a local internal macOS arm64 application at the unchanged 0.1.0 baseline. No public publishing, upload, installer distribution, certificate purchase or notarization is authorized or performed. An internally built app is not represented as an Apple-notarized distribution artifact. Signing state and executable hashes are recorded after artifact inspection.

The ordinary build command is `tauri build --bundles app`, without `native-acceptance`. The test-only driver, configuration identity override and test event listeners must be absent from that executable. The final gate can be marked complete only after this actual optimized build succeeds and the resulting bundle is inspected; a debug build alone is insufficient.

C44 already accepted actual native crop, annotated configured-folder export, pin, OCR and preference restart/corruption subcases. Remaining user-interactive OS cases are specified in `C45-manual-acceptance.md`. The release decision does not waive them, P57 requirements or original runtime comparisons. Minimum macOS remains configured as 12.0; this run does not establish behavior on an older macOS host or another CPU architecture.

Actual optimized build succeeded in 6m23s: `artifacts/C45-release-build.log`. The local arm64 app is `src-tauri/target/release/bundle/macos/Ferby Shottr.app` (approximately 6.5 MiB). Version 0.1.0, Info.plist minimum 12.0 and Mach-O LC_BUILD_VERSION minos 12.0 were verified. The final executable SHA-256 is `5aa2739469e8b32b519f31d904f9d65450a24d104efed295e3775638a5e9f8c2`.

Initial strict verification exposed a linker-only ad-hoc signature without app resource sealing. Signed only the owned generated bundle using `codesign --force --sign - --timestamp=none`, then `codesign --verify --deep --strict` passed. Final signature binds identifier dev.ferby.shottr, Info.plist and resource seal, with no TeamIdentifier, certificate or notarization. No keys/certificates were installed or obtained.

Exact searches for four test-driver markers in the ordinary executable all returned absent. Artifact/signature facts are recorded in `artifacts/C45-release-artifact.json` and `C45-signature-verification.log`. A bounded direct launch smoke check is recorded separately; it is not capture, dialog or original/runtime parity acceptance.

The release build/signing/distribution-decision gate is accepted at 2.5%, raising the accepted MVP from 85.00% to **87.50%**. Twelve-and-a-half percent remains open in `C45-manual-acceptance.md`. No full-acceptance candidate/P57 approval or public distribution is declared. Formatting/lint remains delegated to H01.
