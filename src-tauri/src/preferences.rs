use crate::imaging::{NativeError, validate_window_label};
use ferby_settings_core::AppSettings;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[derive(Default)]
pub struct PreferenceGate(Arc<Mutex<()>>);
impl PreferenceGate { pub(crate) fn shared(&self) -> Arc<Mutex<()>> { Arc::clone(&self.0) } }

#[tauri::command]
pub async fn load_recognition_preferences(window: tauri::WebviewWindow, app: tauri::AppHandle,
    gate: tauri::State<'_, PreferenceGate>) -> Result<crate::recognition_preferences::RecognitionPreferences, NativeError> {
    validate_window_label(window.label())?;
    let path = app.path().app_config_dir().map_err(|e| NativeError::new("settings_failed", e.to_string()))?;
    let gate = Arc::clone(&gate.0);
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = gate.lock().map_err(|_| NativeError::new("settings_failed", "Preferences are unavailable."))?;
        crate::recognition_preferences::load(&path)
    }).await.map_err(|_| NativeError::new("worker_failed", "Recognition preferences loading stopped unexpectedly."))?
}

#[tauri::command]
pub async fn save_recognition_preferences(preferences: crate::recognition_preferences::RecognitionPreferences,
    window: tauri::WebviewWindow, app: tauri::AppHandle, gate: tauri::State<'_, PreferenceGate>)
    -> Result<crate::recognition_preferences::RecognitionPreferences, NativeError> {
    validate_window_label(window.label())?;
    let path = app.path().app_config_dir().map_err(|e| NativeError::new("settings_failed", e.to_string()))?;
    let gate = Arc::clone(&gate.0);
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = gate.lock().map_err(|_| NativeError::new("settings_failed", "Preferences are unavailable."))?;
        crate::recognition_preferences::save(&path, preferences)
    }).await.map_err(|_| NativeError::new("worker_failed", "Recognition preferences saving stopped unexpectedly."))?
}

#[tauri::command]
pub async fn load_saved_shortcuts(window: tauri::WebviewWindow, app: tauri::AppHandle,
    gate: tauri::State<'_, PreferenceGate>) -> Result<crate::shortcuts::ShortcutStatus, NativeError> {
    validate_window_label(window.label())?;
    let path = app.path().app_config_dir().map_err(|e| NativeError::new("settings_failed", e.to_string()))?;
    let gate = Arc::clone(&gate.0);
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = gate.lock().map_err(|_| NativeError::new("settings_failed", "Preferences are unavailable."))?;
        crate::shortcuts::load_saved_at(&path)
    }).await.map_err(|_| NativeError::new("worker_failed", "Shortcut loading stopped unexpectedly."))?
}

#[tauri::command]
pub async fn save_shortcut_preferences(bindings: std::collections::BTreeMap<String, Option<String>>,
    window: tauri::WebviewWindow, app: tauri::AppHandle, gate: tauri::State<'_, PreferenceGate>)
    -> Result<crate::shortcuts::ShortcutStatus, NativeError> {
    validate_window_label(window.label())?;
    let path = app.path().app_config_dir().map_err(|e| NativeError::new("settings_failed", e.to_string()))?;
    let gate = Arc::clone(&gate.0);
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = gate.lock().map_err(|_| NativeError::new("settings_failed", "Preferences are unavailable."))?;
        crate::shortcuts::save_at(&path, bindings)
    }).await.map_err(|_| NativeError::new("worker_failed", "Shortcut saving stopped unexpectedly."))?
}

fn load_at(path: &Path) -> Result<AppSettings, NativeError> {
    if let Some(preferences) = crate::application_preferences::load_optional(path)? { return Ok(preferences.base_settings); }
    ferby_settings_core::load_settings(path).map_err(|e| NativeError::new("settings_failed", e.to_string()))
}
fn save_at(path: &Path, settings: &AppSettings) -> Result<AppSettings, NativeError> {
    if let Some(mut preferences) = crate::application_preferences::load_optional(path)? {
        preferences.base_settings = settings.clone();
        crate::application_preferences::save(path, &preferences)?;
        return Ok(settings.clone());
    }
    ferby_settings_core::save_settings(path, settings).map_err(|e| NativeError::new("settings_failed", e.to_string()))?;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn load_application_preferences(window: tauri::WebviewWindow, app: tauri::AppHandle,
    gate: tauri::State<'_, PreferenceGate>) -> Result<crate::application_preferences::ApplicationPreferences, NativeError> {
    validate_window_label(window.label())?;
    let path = app.path().app_config_dir().map_err(|e| NativeError::new("settings_failed", e.to_string()))?;
    let gate = Arc::clone(&gate.0);
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = gate.lock().map_err(|_| NativeError::new("settings_failed", "Preferences are unavailable."))?;
        match crate::application_preferences::load_optional(&path)? {
            Some(value) => Ok(value),
            None => Ok(crate::application_preferences::ApplicationPreferences::defaults(load_at(&path)?)),
        }
    }).await.map_err(|_| NativeError::new("worker_failed", "Preference loading stopped unexpectedly."))?
}

#[tauri::command]
pub async fn save_application_preferences(preferences: crate::application_preferences::ApplicationPreferences,
    window: tauri::WebviewWindow, app: tauri::AppHandle, gate: tauri::State<'_, PreferenceGate>)
    -> Result<crate::application_preferences::ApplicationPreferences, NativeError> {
    validate_window_label(window.label())?;
    preferences.validate()?;
    let path = app.path().app_config_dir().map_err(|e| NativeError::new("settings_failed", e.to_string()))?;
    let gate = Arc::clone(&gate.0);
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = gate.lock().map_err(|_| NativeError::new("settings_failed", "Preferences are unavailable."))?;
        crate::application_preferences::save(&path, &preferences)?;
        Ok(preferences)
    }).await.map_err(|_| NativeError::new("worker_failed", "Preference saving stopped unexpectedly."))?
}

#[tauri::command]
pub async fn load_preferences(window: tauri::WebviewWindow, app: tauri::AppHandle,
    gate: tauri::State<'_, PreferenceGate>) -> Result<AppSettings, NativeError> {
    validate_window_label(window.label())?;
    let path = app.path().app_config_dir().map_err(|e| NativeError::new("settings_failed", e.to_string()))?;
    let gate = Arc::clone(&gate.0);
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = gate.lock().map_err(|_| NativeError::new("settings_failed", "Preferences are unavailable."))?;
        load_at(&path)
    }).await.map_err(|_| NativeError::new("worker_failed", "Preference loading stopped unexpectedly."))?
}

#[tauri::command]
pub async fn save_preferences(settings: AppSettings, window: tauri::WebviewWindow,
    app: tauri::AppHandle, gate: tauri::State<'_, PreferenceGate>) -> Result<AppSettings, NativeError> {
    validate_window_label(window.label())?;
    settings.validate().map_err(|e| NativeError::new("invalid_settings", e.to_string()))?;
    let path = app.path().app_config_dir().map_err(|e| NativeError::new("settings_failed", e.to_string()))?;
    let gate = Arc::clone(&gate.0);
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = gate.lock().map_err(|_| NativeError::new("settings_failed", "Preferences are unavailable."))?;
        save_at(&path, &settings)
    }).await.map_err(|_| NativeError::new("worker_failed", "Preference saving stopped unexpectedly."))?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preferences_roundtrip_rejects_corruption_without_overwriting_it() {
        let dir = tempfile::tempdir().unwrap();
        let mut settings = load_at(dir.path()).unwrap();
        settings.jpeg_quality = 73;
        settings.save_format = ferby_settings_core::SaveFormat::Jpeg;
        save_at(dir.path(), &settings).unwrap();
        assert_eq!(load_at(dir.path()).unwrap(), settings);
        let path = dir.path().join(ferby_settings_core::SETTINGS_FILE_NAME);
        std::fs::write(&path, b"broken").unwrap();
        assert_eq!(load_at(dir.path()).unwrap_err().code, "settings_failed");
        assert_eq!(std::fs::read(path).unwrap(), b"broken");
    }
    #[test]
    fn invalid_preference_values_do_not_replace_valid_settings() {
        let dir = tempfile::tempdir().unwrap();
        let settings = AppSettings::default();
        save_at(dir.path(), &settings).unwrap();
        let mut invalid = settings.clone(); invalid.jpeg_quality = 0;
        assert!(save_at(dir.path(), &invalid).is_err());
        assert_eq!(load_at(dir.path()).unwrap(), settings);
        assert!(serde_json::from_value::<AppSettings>(serde_json::json!({"saveFormat":"png","jpegQuality":90,"downscaleRetina":false,"showPreview":true,"path":"/tmp/elsewhere"})).is_err());
    }
}
