use crate::imaging::{NativeError, NativeJobs, validate_window_label};
use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder};

const ID: &str = "ferby-menu-bar";

#[tauri::command]
pub async fn set_menu_bar_icon(enabled: bool, window: tauri::WebviewWindow, app: tauri::AppHandle,
    jobs: tauri::State<'_, NativeJobs>) -> Result<(), NativeError> {
    validate_window_label(window.label())?;
    let _guard = jobs.acquire()?;
    let error = |reason: tauri::Error| NativeError::new("menu_bar_failed", reason.to_string());
    if let Some(icon) = app.tray_by_id(ID) { return icon.set_visible(enabled).map_err(error); }
    if !enabled { return Ok(()); }
    let item = |id, title| MenuItem::with_id(&app, id, title, true, None::<&str>);
    let show = item("show-workspace", "Show Ferby workspace").map_err(error)?;
    let fullscreen = item("capture-fullscreen", "Capture primary display").map_err(error)?;
    let area = item("capture-area", "Capture area…").map_err(error)?;
    let capture_window = item("capture-window", "Capture window…").map_err(error)?;
    let active = item("capture-active-window", "Capture last active app window").map_err(error)?;
    let scrolling = item("capture-scrolling", "Manual scrolling capture…").map_err(error)?;
    let close = item("close-workspace", "Close workspace…").map_err(error)?;
    let menu = Menu::with_items(&app, &[&show, &fullscreen, &area, &capture_window, &active, &scrolling, &close]).map_err(error)?;
    let icon = app.default_window_icon().cloned().ok_or_else(|| NativeError::new("menu_bar_failed", "Application icon is unavailable."))?;
    TrayIconBuilder::with_id(ID).icon(icon).tooltip("Ferby Shottr").menu(&menu).build(&app).map_err(error)?;
    // The existing global native menu handler receives tray menu IDs as well.
    Ok(())
}

pub fn hide_on_close(app: &tauri::AppHandle) -> Result<(), NativeError> {
    if let Some(icon) = app.tray_by_id(ID) {
        icon.set_visible(false).map_err(|e| NativeError::new("menu_bar_failed", e.to_string()))?;
    }
    Ok(())
}
