# ferby-application-services

Standalone Rust crate providing application-level OS integrations for Ferby Shottr:
- **Autostart at Login**: Query and explicitly toggle launch-at-login state (`LoginState { enabled, supported }`) using pinned `tauri-plugin-autostart = "=2.7.0"`. Mutations are gated to packaged `.app` bundles to prevent invalid `LaunchAgent` plist entries.
- **Static Notifications**: Post-capture system notifications (`CaptureCompletion::Opened`, `Copied`, `Saved`) using pinned `tauri-plugin-notification = "=2.8.0"`. Notifications convey static status only, ensuring zero leak of captured image buffers, OCR output, or filenames.
- **macOS 12 Monterey Compatibility**: `auto-launch 0.6.0` transitively pulls in `smappservice-rs` (macOS 13+ ServiceManagement API). On macOS 12, the traditional `LaunchAgent` backend (`~/Library/LaunchAgents`) is preserved and required; minimum OS must not be raised.

Root command wiring, plugin registration, and capability permissions remain owned by Codex C29.

