# Current acceptance

On 2026-11-12 the user explicitly accepted the existing features at **100% USER_REPORTED functional acceptance**. This replaces the historical 85% functional checkpoint; it is user acceptance, not a claim of exhaustive or bug-free behavior from automated tests. Existing per-case passes and earlier reports remain historical records.

The separate **native updater notification** check is still pending. With 1.1.8 installed, release 1.1.9 provides the next available version: relaunch or Check for Updates, verify the macOS notification, click it to open Updates, then download/install/restart explicitly. No automated test sends a real notification or installs an update. The agent does not change macOS notification permissions.

1.1.9 optimizes route loading, canvas allocations, Local draft writes and previews, and retires isolated obsolete Library UI/tests. Its regression evidence is recorded in the release/task notes. Actual perceived speed is measured on the user's installed app; source counters and bundle sizes are not a universal runtime speed guarantee.
