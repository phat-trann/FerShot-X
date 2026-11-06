# C10 application behavior wiring

Implemented versioned native application preferences with 16 KiB bounds, exact typed schema, atomic private staging/replacement, legacy base-settings fallback and one authoritative extended envelope after migration. Main-window commands share the existing preference gate; legacy base saves preserve extended fields.

The app now exposes post-capture editor/preview/copy/save behavior, default zoom and persistent always-on-top. Copy/save retain recovery images; cancelled saving preserves the library. Notifications, login and menu-bar controls remain capability-disabled pending native implementation.

Checks: TypeScript no-emit and locked offline Rust library compilation passed. Initial TypeScript command used nonexistent tsconfig.app.json; rerun used the actual tsconfig.json. Tests: NOT RUN — deferred by user. Formatting/lint delegated to Copilot H01.

Origin: T04-pin-library.md and T07-settings-sharing.md; Shottr event ordering/defaults remain UNKNOWN. These are explicit Ferby decisions, not runtime parity. USER_WAIVED_REVIEW; later overall review required. MVP acceptance unchanged at 68.75%.
