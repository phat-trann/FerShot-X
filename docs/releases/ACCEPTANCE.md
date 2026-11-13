# Current acceptance

Version 1.2.0 publishes the accumulated shared UI, Settings autosave/checkboxes, Library improvements and one-click explicit update flow after the user's 2026-11-13 publication authorization. Earlier 1.1.11 candidate notes are historical. Final automated validation is recorded in the 1.2.0 release notes; real multi-display centering, reopened Blur and signed update/native notification delivery remain installed-app checks.

On 2026-11-12 the user explicitly accepted the existing features at **100% USER_REPORTED functional acceptance**. This replaces the historical 85% functional checkpoint; it is user acceptance, not a claim of exhaustive or bug-free behavior from automated tests. Existing per-case passes and earlier reports remain historical records.

The separate **native updater notification** check failed on installed 1.1.8: the user could see available 1.1.9 in Settings but received no system notice. Patch 1.1.10 replaces the legacy macOS delivery path with UserNotifications authorization/submission callbacks with retained foreground notification handling. The later Settings redesign removes the Test Notification button. Install the release through the Updates UI, then test automatic available-version delivery/click behavior when a subsequent version is available. No automated test sends a real notification or changes macOS notification permissions.

1.1.9 optimizes route loading, canvas allocations, Local draft writes and previews, and retires isolated obsolete Library UI/tests. Its regression evidence is recorded in the release/task notes. Actual perceived speed is measured on the user's installed app; source counters and bundle sizes are not a universal runtime speed guarantee.
