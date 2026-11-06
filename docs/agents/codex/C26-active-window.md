# C26 active-window capture source

Implemented NSWorkspace activation tracking of the last external application PID, main-thread observer lifetime/removal, bounded CoreGraphics normal-layer window selection and owner/ID revalidation after hiding Ferby. The capture runner accepts a validated nonzero numeric window ID through fixed arguments; noninteractive failures are not classified as user cancellation. App, desktop and tray controls share post-capture behavior. Window scale remains unknown rather than guessed.

Original: Shottr 1.9.3/137, target.json hash; T02-capture-ocr.md, UI-10 objects141/188 and REA ev_7a54c59efe5ad259d8b8b7c187965d29df9ca99f3686ffa068c92add599df2ca. These declarations/imports do not establish target window selection logic; Ferby explicitly chooses the last active application's visible normal window.

Tests/typechecks/builds: NOT RUN — deferred by user. APIs read from installed pinned bindings; direct dependencies reuse existing locked versions. No OS capture executed. Formatting/lint delegated to Copilot H01. USER_WAIVED_REVIEW; later overall review required. MVP acceptance remains68.75%.
