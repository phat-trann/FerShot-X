# Phase-1 manual acceptance — complete

Final status (2026-11-09): **100% USER_REPORTED manual acceptance**. The user confirmed all phase-1 behavior works. See C56-phase1-accepted.md. The exact C55 retest bundle is preserved separately under artifacts/accepted; the current development bundle contains additional, unaccepted phase-2 FTP work.

## Historical checklist before final user confirmation

Use the ordinary Ferby Shottr app bundle, synthetic images and an isolated synthetic target window. Do not use personal desktop content or change OS privacy settings automatically. Capture must begin from an explicit human Capture action; the native automation harness deliberately does not invoke screen capture.

| Outstanding gate | Required observation | Current status |
| --- | --- | --- |
| Capture modes / cancellation (3.75%) | Human clicks fullscreen, area, window, active window and repeat area with the synthetic target; record output dimensions/provenance. Cancel each interactive selector and confirm no image is added and workspace returns. | NOT EXECUTED |
| Permission/error/window restoration (3.75%) | Record actual allowed/denied capture behavior and actionable error. Confirm hidden workspace restores after success/cancel/failure. No automated privacy-setting change. | NOT EXECUTED |
| Save dialog / existing-file acceptance (2.5%) | Clear configured export folder, choose a private test destination with the actual Save dialog, cancel once, then select an existing fixture. Record cancellation and demonstrate existing bytes are unchanged. | NOT EXECUTED |
| Full native manual matrix (2.5%) | Review the above observations alongside C44 actual crop/export/pin/OCR/preferences evidence; record any discrepancy and fix/retest it. | INCOMPLETE |

C44 provides actual native evidence for crop, annotated configured-folder export, pin controls/ownership, Vision OCR and saved/corrupt preferences across restart. These do not substitute for the outstanding interactive OS cases. Host Accessibility and Screen Recording preflights were false; those observations concern the validation host, not Ferby's own permission identity.

Record acceptance observations with app executable SHA-256, synthetic fixture hash, exact action, result and any failure. Keep original Shottr runtime parity separate. No negative test result, missing permission or unexecuted case may be relabeled passed to reach 100%.

## User results — 2026-11-09

Permission/error/window restoration and Save dialog/cancel/existing-file checks were reported good by the user and recorded as USER_REPORTED PASS. Capture Area was rejected because it selected within a fullscreen screenshot in the workspace. Capture/full native matrix remain open. See C55-area-capture.md for the direct native Area/remembered Repeat fix and pending retest. Phase-1 acceptance is now 93.75%, separate from phase-2 acceptance.
