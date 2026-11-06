//! Standalone native application services for Ferby Shottr.
//!
//! Provides login autostart state queries/mutations and static system notifications
//! using official pinned Tauri plugins (`tauri-plugin-autostart` and `tauri-plugin-notification`).

use serde::{Deserialize, Serialize};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_notification::NotificationExt;

/// Current autostart at login status and platform availability.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginState {
    pub enabled: bool,
    pub supported: bool,
}

/// Static completion action kinds for post-capture notifications.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CaptureCompletion {
    Opened,
    Copied,
    Saved,
}

impl CaptureCompletion {
    /// Returns static descriptive text with zero user data, filenames, or OCR content.
    pub fn static_body(&self) -> &'static str {
        match self {
            Self::Opened => "Capture opened in editor.",
            Self::Copied => "Capture copied to clipboard.",
            Self::Saved => "Capture saved to storage.",
        }
    }
}

/// Checks whether the running binary is hosted inside a packaged macOS application bundle (`.app`).
/// Autostart mutations are strictly restricted to packaged applications to avoid corrupted LaunchAgents.
pub fn is_packaged_app() -> bool {
    std::env::current_exe()
        .map(|exe_path| {
            exe_path
                .components()
                .any(|component| component.as_os_str().to_string_lossy().ends_with(".app"))
        })
        .unwrap_or(false)
}

/// Queries the current launch-at-login state.
///
/// In unpackaged development environments, returns `supported: false` with `enabled: false`.
pub fn login_state<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<LoginState, String> {
    if !is_packaged_app() {
        return Ok(LoginState {
            enabled: false,
            supported: false,
        });
    }

    let manager = app.autolaunch();
    let enabled = manager.is_enabled().map_err(|err| err.to_string())?;
    Ok(LoginState {
        enabled,
        supported: true,
    })
}

/// Explicitly configures launch-at-login for the application.
///
/// Returns the resulting enabled status, or an error if invoked outside a packaged bundle.
pub fn set_launch_at_login<R: tauri::Runtime>(app: &tauri::AppHandle<R>, enabled: bool) -> Result<bool, String> {
    if !is_packaged_app() {
        return Err("Launch at login is only supported for packaged applications.".to_string());
    }

    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|err| err.to_string())?;
    } else {
        manager.disable().map_err(|err| err.to_string())?;
    }

    manager.is_enabled().map_err(|err| err.to_string())
}

/// Dispatches a native static system notification upon capture completion.
///
/// Contains static status messages only; never leaks captured pixels, OCR text, or dynamic filenames.
pub fn notify_capture_completed<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    action: CaptureCompletion,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title("Ferby Shottr")
        .body(action.static_body())
        .show()
        .map_err(|err| err.to_string())
}

