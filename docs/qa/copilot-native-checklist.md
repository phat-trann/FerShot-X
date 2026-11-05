# Native macOS acceptance checklist

**Status: NOT EXECUTED.** Use synthetic images and isolated test windows. Do not use private screenshots or change permissions without explicit user action. Browser tests and mocked IPC are not native acceptance evidence.

| # | Manual step | Expected result | Evidence to record |
|---|---|---|---|
| 1 | Trigger fullscreen capture and let it complete; separately trigger interactive area and window capture, then press Escape before completion. | Fullscreen completes without requiring a selection-cancel step; Escape cancels only the interactive area/window flows and returns to the workspace without a stale job or partial document. | Mode, window/display, timestamp, result/cancel state, log ID. |
| 2 | Deny or otherwise exercise unavailable screen-capture permission, then retry after the user resolves it. | A clear permission error is surfaced; no fake image or silent success; retry follows the current permission state. | Permission state, exact error text, retry result. |
| 3 | Open a synthetic image, crop and resize it, then compare the original session document with the derived document. | Crop/resize creates a derived image and preserves the original dimensions/content unchanged. | Input hash/dimensions, output hash/dimensions, original comparison. |
| 4 | Start PNG and JPEG Save As, then cancel each native dialog. | Cancellation leaves the workspace intact and reports no successful export. | Format, dialog action, returned status, destination field. |
| 5 | Save PNG and JPEG to a destination containing an existing file, then repeat with a new destination. | Existing files are refused without overwrite; a new destination saves the requested format successfully. | Destination, pre/post file hashes, refusal message, output metadata. |

Current C04/C05 evidence covers unit tests, browser tests with mocked IPC, and native-core tests only; it does not execute this GUI checklist. Fill each evidence field only after a real user-triggered macOS pass.
