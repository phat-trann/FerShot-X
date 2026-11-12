use crate::imaging::NativeError;
use tauri::{Emitter, Manager};

pub const LABEL: &str = "preferences";
pub fn validate_label(label: &str) -> Result<(), NativeError> {
    if matches!(label, "main" | LABEL) { Ok(()) }
    else { Err(NativeError::new("forbidden_window", "Preferences are only available in the workspace or Settings window.")) }
}
pub fn changed(app: &tauri::AppHandle) { let _ = app.emit_to("main", "fershot-preferences-updated", ()); }
pub fn open(app: &tauri::AppHandle) -> Result<(), NativeError> {
    open_tab(app, None)
}
pub(crate) fn open_tab(app: &tauri::AppHandle, tab: Option<&str>) -> Result<(), NativeError> {
    let tab=tab.filter(|tab|matches!(*tab,"general"|"hotkeys"|"uploading"|"advanced"|"updates"));
    let failure = |e: tauri::Error| NativeError::new("preferences_window_failed", e.to_string());
    let on_top=app.get_webview_window("main").is_some_and(|window|window.is_always_on_top().unwrap_or(false));
    if let Some(window) = app.get_webview_window(LABEL) {
        window.set_always_on_top(on_top).map_err(failure)?;
        if let Some(tab)=tab { let _=window.emit("fershot-preferences-tab",tab); }
        return crate::lifecycle::bring_to_front(&window).map_err(failure);
    }
    let url=format!("index.html?preferences{}",tab.map(|t|format!("&tab={t}")).unwrap_or_default());
    let builder=tauri::WebviewWindowBuilder::new(app, LABEL, tauri::WebviewUrl::App(url.into()))
        .title("FerShot X — Settings").inner_size(532.0, 637.0).min_inner_size(532.0, 490.0)
        .resizable(true).minimizable(false).always_on_top(on_top);
    #[cfg(target_os="macos")]
    let builder=builder.title_bar_style(tauri::TitleBarStyle::Overlay).hidden_title(true);
    let window=builder.build().map_err(failure)?;
    crate::lifecycle::apply_material(&window);
    crate::lifecycle::bring_to_front(&window).map_err(failure)
}
#[tauri::command]
pub async fn open_preferences_window(tab: Option<String>, window: tauri::WebviewWindow, app: tauri::AppHandle) -> Result<(), NativeError> {
    crate::library_window::validate_reader(window.label())?; open_tab(&app,tab.as_deref())
}
#[tauri::command]
pub fn close_preferences_window(window: tauri::WebviewWindow) -> Result<(), NativeError> {
    if window.label() != LABEL { return Err(NativeError::new("forbidden_window", "Only Settings may close this window.")); }
    window.close().map_err(|e| NativeError::new("preferences_window_failed", e.to_string()))
}
#[cfg(test)]
mod tests {
    #[test] fn settings_scope_does_not_grant_image_or_secondary_window_privileges() {
        assert!(super::validate_label("preferences").is_ok()); assert!(super::validate_label("main").is_ok());
        for label in ["pin-1", "print-1", "preferences-old", ""] { assert!(super::validate_label(label).is_err()); }
        assert!(crate::imaging::validate_window_label("preferences").is_err());
    }
}
