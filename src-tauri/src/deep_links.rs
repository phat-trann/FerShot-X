use crate::imaging::{NativeError, validate_window_label};
use serde::{Serialize, Deserialize};
use std::{collections::VecDeque, sync::Mutex};
use tauri::{Emitter, Manager};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct LinkPolicy { version: u8, enabled: bool }

#[tauri::command]
pub async fn read_link_policy(window: tauri::WebviewWindow, app: tauri::AppHandle,
    gate: tauri::State<'_, crate::preferences::PreferenceGate>) -> Result<bool, NativeError> {
    validate_window_label(window.label())?;
    let path = app.path().app_config_dir().map_err(|e| NativeError::new("link_policy_failed", e.to_string()))?; let gate = gate.shared();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = gate.lock().map_err(|_| NativeError::new("link_policy_failed", "Preferences unavailable."))?;
        let Some(raw) = crate::application_preferences::read_document(&path, crate::application_preferences::Document::DeepLinks)? else { return Ok(true); };
        let policy: LinkPolicy = serde_json::from_slice(&raw).map_err(|e| NativeError::new("link_policy_failed", e.to_string()))?;
        if policy.version != 1 { return Err(NativeError::new("link_policy_failed", "Unsupported link policy version.")); }
        Ok(policy.enabled)
    }).await.map_err(|_| NativeError::new("link_policy_failed", "Link policy loading stopped unexpectedly."))?
}

#[tauri::command]
pub async fn save_link_policy(enabled: bool, window: tauri::WebviewWindow, app: tauri::AppHandle,
    gate: tauri::State<'_, crate::preferences::PreferenceGate>) -> Result<bool, NativeError> {
    validate_window_label(window.label())?;
    let path = app.path().app_config_dir().map_err(|e| NativeError::new("link_policy_failed", e.to_string()))?; let gate = gate.shared();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = gate.lock().map_err(|_| NativeError::new("link_policy_failed", "Preferences unavailable."))?;
        let raw = serde_json::to_vec(&LinkPolicy { version: 1, enabled }).map_err(|e| NativeError::new("link_policy_failed", e.to_string()))?;
        crate::application_preferences::write_document(&path, crate::application_preferences::Document::DeepLinks, &raw)?;
        Ok(enabled)
    }).await.map_err(|_| NativeError::new("link_policy_failed", "Link policy saving stopped unexpectedly."))?
}

#[derive(Clone, Serialize)]
pub struct PendingLink { id: String, url: String }
#[derive(Default)]
struct Queue { entries: VecDeque<PendingLink>, sequence: u64 }
#[derive(Default)]
pub struct DeepLinkStore(Mutex<Queue>);

pub fn on_event(app: &tauri::AppHandle, event: &tauri::RunEvent) {
    #[cfg(target_os = "macos")]
    if let tauri::RunEvent::Opened { urls } = event {
        let store = app.state::<DeepLinkStore>();
        let Ok(mut queue) = store.0.lock() else { return; };
        for url in urls.iter().take(16) {
            if queue.entries.len() >= 16 { break; }
            if url.as_str().len() > 2048 || url.scheme() != "ferby" || !url.username().is_empty() ||
                url.password().is_some() || url.port().is_some() || url.fragment().is_some() ||
                !matches!(url.host_str(), Some("capture") | Some("editor")) ||
                !matches!(url.path(), "" | "/") { continue; }
            let text = url.as_str().to_owned();
            if queue.entries.iter().any(|entry| entry.url == text) { continue; }
            queue.sequence = queue.sequence.wrapping_add(1);
            let id = format!("native-link-{}", queue.sequence);
            queue.entries.push_back(PendingLink { id, url: text });
        }
        drop(queue);
        if let Some(main) = app.get_webview_window("main") { let _ = main.emit("ferby-deep-links-pending", ()); }
    }
    #[cfg(not(target_os = "macos"))]
    let _ = (app, event);
}

/// Delivery is inert: no capture, clipboard, file opening or external URL launch.
#[tauri::command]
pub fn read_pending_deep_links(window: tauri::WebviewWindow, store: tauri::State<'_, DeepLinkStore>) -> Result<Vec<PendingLink>, NativeError> {
    validate_window_label(window.label())?;
    let queue = store.0.lock().map_err(|_| NativeError::new("deep_link_failed", "Pending links are unavailable."))?;
    Ok(queue.entries.iter().cloned().collect())
}

#[tauri::command]
pub fn acknowledge_deep_links(ids: Vec<String>, window: tauri::WebviewWindow, store: tauri::State<'_, DeepLinkStore>) -> Result<(), NativeError> {
    validate_window_label(window.label())?;
    if ids.len() > 16 || ids.iter().any(|id| id.len() > 64 || !id.starts_with("native-link-")) {
        return Err(NativeError::new("deep_link_failed", "Invalid link acknowledgement."));
    }
    let mut queue = store.0.lock().map_err(|_| NativeError::new("deep_link_failed", "Pending links are unavailable."))?;
    queue.entries.retain(|entry| !ids.contains(&entry.id));
    Ok(())
}
