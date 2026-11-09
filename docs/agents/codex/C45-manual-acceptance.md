# Remaining native/manual acceptance

Use the ordinary Ferby Shottr app bundle, synthetic images and an isolated synthetic target window. Do not use personal desktop content or change OS privacy settings automatically. Capture must begin from an explicit human Capture action; the native automation harness deliberately does not invoke screen capture.

| Outstanding gate | Required observation | Current status |
| --- | --- | --- |
| Capture modes / cancellation (3.75%) | Human clicks fullscreen, area, window, active window and repeat area with the synthetic target; record output dimensions/provenance. Cancel each interactive selector and confirm no image is added and workspace returns. | NOT EXECUTED |
| Permission/error/window restoration (3.75%) | Record actual allowed/denied capture behavior and actionable error. Confirm hidden workspace restores after success/cancel/failure. No automated privacy-setting change. | NOT EXECUTED |
| Save dialog / existing-file acceptance (2.5%) | Clear configured export folder, choose a private test destination with the actual Save dialog, cancel once, then select an existing fixture. Record cancellation and demonstrate existing bytes are unchanged. | NOT EXECUTED |
| Full native manual matrix (2.5%) | Review the above observations alongside C44 actual crop/export/pin/OCR/preferences evidence; record any discrepancy and fix/retest it. | INCOMPLETE |

C44 provides actual native evidence for crop, annotated configured-folder export, pin controls/ownership, Vision OCR and saved/corrupt preferences across restart. These do not substitute for the outstanding interactive OS cases. Host Accessibility and Screen Recording preflights were false; those observations concern the validation host, not Ferby's own permission identity.

Record acceptance observations with app executable SHA-256, synthetic fixture hash, exact action, result and any failure. Keep original Shottr runtime parity separate. No negative test result, missing permission or unexecuted case may be relabeled passed to reach 100%.
