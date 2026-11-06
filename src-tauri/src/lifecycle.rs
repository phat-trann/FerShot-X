use crate::imaging::{NativeError, NativeJobs, validate_window_label};
use tauri::Emitter;
use tauri::Manager;

pub fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    if window.label() == "main" {
        if matches!(event, tauri::WindowEvent::Destroyed) { crate::active_window::stop(); }
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            // Fail closed while the frontend listener is loading or unavailable.
            let _ = window.emit("ferby-workspace-close-requested", ());
        }
    }
}

/// Only the main workspace may request its own destruction after explicit confirmation.
#[tauri::command]
pub async fn close_workspace(window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>) -> Result<(), NativeError> {
    validate_window_label(window.label())?;
    let _guard = jobs.acquire()?;
    crate::shortcuts::clear_on_close(window.app_handle())?;
    crate::dragging::clear_on_close(&window.app_handle().state::<crate::dragging::DragStore>())?;
    crate::menu_bar::hide_on_close(window.app_handle())?;
    window.destroy().map_err(|error| NativeError::new("close_failed", error.to_string()))
}

#[tauri::command]
pub fn set_workspace_on_top(window: tauri::WebviewWindow, enabled: bool) -> Result<(), NativeError> {
    validate_window_label(window.label())?;
    window.set_always_on_top(enabled).map_err(|error| NativeError::new("window_failed", error.to_string()))
}
