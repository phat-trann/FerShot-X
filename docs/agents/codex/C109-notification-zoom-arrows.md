# C109 notification, zoom and arrow repairs

Installed 1.1.8/public 1.1.9 were confirmed; user sees the available version but no notification. Legacy backend reports granted permission and returns before delivery errors. Exact OS failure remains unproven.

macOS updater notices now use modern UserNotifications authorization/submission callbacks and a retained foreground/click delegate through already-locked objc2 bindings. Added Test Notification, enum status and specific error logs; explicit install/restart remain. No dependency version upgrades.

Zoom anchors document coordinates beneath the cursor with batched updates; Fit/new documents reset offsets. Arrow shafts stop at bounded filled head bases, consistently in preview/manipulation/export.

Existing features remain 100% USER_REPORTED accepted. Native notification delivery still needs manual retest. No live notification/capture/input/server, permission, credentials or private signing access. Patch 1.1.10. Passed: 434 unit, 77 native, 77 browser tests, production TypeScript/build, version consistency and warning-free native compilation. Formatting/lint not run.
