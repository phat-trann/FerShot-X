# C107 native update notification and repaint

Recorded USER_REPORTED checklist 2/3/5–8 PASS; the banner worked, but the user wants a native macOS notice. Repeated captures still occasionally blank until zoom. Acceptance remains 85%.

Replaced the renderer banner with the pinned native notification plugin. Available versions deduplicate successful submissions per process, retain failed-send retries and open Updates on tap. Notification failures do not block startup/check/install. No new dependencies or permission mutations.

Edit re-measures its viewport on presentation/focus/visibility and recreates bounded backing surfaces with immediate and bounded repaint callbacks through 400ms. Capture/unmount cancels callbacks; masking, drafts and zoom remain intact. Regression injects late backing loss across five presentations without changing zoom.

No real notifications, OS capture/input, FTP, credentials or updater installation occurred. Native delivery/tap and repeated-capture acceptance require manual retest. Patch: 1.1.8. Passed: TypeScript, 441 unit, 76 native and 72 browser tests. Native warnings denied. Formatting/lint not run.
