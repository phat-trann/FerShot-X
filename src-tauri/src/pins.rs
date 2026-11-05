use crate::imaging::{self, ImagePayload, NativeError, NativeJobs};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex, atomic::{AtomicU64, Ordering}};
use tauri::{Emitter, Manager};

const MAX_PIN_WINDOWS: usize = 4;
const MAX_PIN_ENCODED: usize = 64 * 1024 * 1024;
static NEXT_PIN: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PinDocument { source_id: String, name: String, image: ImagePayload }
#[derive(Default, Clone)]
pub struct PinStore(Arc<Mutex<HashMap<String, Arc<PinDocument>>>>);
impl PinStore {
    fn get(&self, label: &str) -> Result<Arc<PinDocument>, NativeError> {
        self.0.lock().map_err(|_| NativeError::new("pin_failed", "Pin state is unavailable."))?
            .get(label).cloned().ok_or_else(|| NativeError::new("forbidden_window", "This window does not own a pinned image."))
    }
    fn insert(&self, label: String, document: PinDocument) -> Result<(), NativeError> {
        let mut store = self.0.lock().map_err(|_| NativeError::new("pin_failed", "Pin state is unavailable."))?;
        let bytes = store.values().map(|doc| doc.image.png_base64.len()).sum::<usize>();
        if store.len() >= MAX_PIN_WINDOWS || document.image.png_base64.len() > MAX_PIN_ENCODED.saturating_sub(bytes) {
            return Err(NativeError::new("pin_limit", "Close a pinned image before opening another."));
        }
        if store.contains_key(&label) { return Err(NativeError::new("pin_failed", "Pin identifier already exists.")); }
        store.insert(label, Arc::new(document)); Ok(())
    }
    fn remove(&self, label: &str) { if let Ok(mut store) = self.0.lock() { store.remove(label); } }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OpenPinRequest { source_id: String, name: String, png_base64: String }
fn validate_source(id: &str) -> Result<(), NativeError> {
    if id.is_empty() || id.len() > 128 || !id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_') {
        return Err(NativeError::new("invalid_pin", "Invalid source document identifier."));
    }
    Ok(())
}

#[tauri::command]
pub async fn open_pin(request: OpenPinRequest, window: tauri::WebviewWindow, app: tauri::AppHandle,
    pins: tauri::State<'_, PinStore>, jobs: tauri::State<'_, NativeJobs>) -> Result<String, NativeError> {
    imaging::validate_window_label(window.label())?;
    validate_source(&request.source_id)?; imaging::validate_name(&request.name)?;
    let guard = jobs.acquire()?;
    let image = tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        imaging::payload(imaging::decode_input(&request.png_base64)?)
    }).await.map_err(|_| NativeError::new("worker_failed", "Pin preparation stopped unexpectedly."))??;
    let width = f64::from(image.width).clamp(320.0, 1000.0);
    let height = (f64::from(image.height) + 220.0).clamp(320.0, 900.0);
    let label = format!("pin-{}", NEXT_PIN.fetch_add(1, Ordering::Relaxed));
    let title = request.name.clone();
    pins.insert(label.clone(), PinDocument { source_id: request.source_id, name: request.name, image })?;
    let created = tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App("index.html?pin=1".into()))
        .title(title).inner_size(width, height).min_inner_size(300.0, 240.0).always_on_top(true).build();
    let child = match created { Ok(value) => value, Err(error) => { pins.remove(&label); return Err(NativeError::new("pin_failed", error.to_string())); } };
    let owned = pins.inner().clone(); let closing_label = label.clone();
    child.on_window_event(move |event| { if matches!(event, tauri::WindowEvent::Destroyed) { owned.remove(&closing_label); } });
    Ok(label)
}

#[tauri::command]
pub async fn get_pin(window: tauri::WebviewWindow, pins: tauri::State<'_, PinStore>) -> Result<PinDocument, NativeError> {
    let document = pins.get(window.label())?;
    tauri::async_runtime::spawn_blocking(move || document.as_ref().clone()).await
        .map_err(|_| NativeError::new("worker_failed", "Pin loading stopped unexpectedly."))
}
#[tauri::command]
pub async fn close_pin(window: tauri::WebviewWindow, pins: tauri::State<'_, PinStore>) -> Result<(), NativeError> {
    pins.get(window.label())?;
    window.close().map_err(|e| NativeError::new("pin_failed", e.to_string()))?;
    pins.remove(window.label()); Ok(())
}
#[tauri::command]
pub async fn copy_pin(window: tauri::WebviewWindow, pins: tauri::State<'_, PinStore>,
    jobs: tauri::State<'_, NativeJobs>) -> Result<(), NativeError> {
    let guard = jobs.acquire()?;
    let document = pins.get(window.label())?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        imaging::copy_encoded_image(&document.image.png_base64)
    }).await.map_err(|_| NativeError::new("worker_failed", "Pin copy stopped unexpectedly."))?
}
#[tauri::command]
pub async fn edit_pin(window: tauri::WebviewWindow, app: tauri::AppHandle,
    pins: tauri::State<'_, PinStore>) -> Result<(), NativeError> {
    let document = pins.get(window.label())?;
    let main = app.get_webview_window("main").ok_or_else(|| NativeError::new("pin_failed", "Main workspace is unavailable."))?;
    app.emit_to("main", "ferby-pin-edit", document.as_ref()).map_err(|e| NativeError::new("pin_failed", e.to_string()))?;
    main.show().and_then(|_| main.set_focus()).map_err(|e| NativeError::new("pin_failed", e.to_string()))?;
    window.close().map_err(|e| NativeError::new("pin_failed", e.to_string()))?;
    pins.remove(window.label()); Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> PinDocument { PinDocument { source_id: "synthetic".into(), name: "synthetic.png".into(), image: ImagePayload { png_base64: "small".into(), width: 1, height: 1, byte_size: 5 } } }
    #[test]
    fn pin_store_is_owned_bounded_and_cleaned_up() {
        let pins = PinStore::default();
        assert_eq!(pins.get("main").unwrap_err().code, "forbidden_window");
        for i in 0..MAX_PIN_WINDOWS { pins.insert(format!("pin-{i}"), fixture()).unwrap(); }
        assert_eq!(pins.insert("pin-more".into(), fixture()).unwrap_err().code, "pin_limit");
        assert!(pins.get("pin-other").is_err());
        pins.remove("pin-0"); pins.insert("pin-next".into(), fixture()).unwrap();
    }
    #[test]
    fn pin_requests_reject_paths_unknown_fields_and_large_source_ids() {
        for id in ["", "../main", "pin?q=1", "unsafe id"] { assert!(validate_source(id).is_err()); }
        assert!(validate_source("uuid-source_1").is_ok());
        assert!(validate_source(&"x".repeat(129)).is_err());
        assert!(serde_json::from_value::<OpenPinRequest>(serde_json::json!({"sourceId":"doc","name":"image.png","pngBase64":"x","url":"https://example.invalid"})).is_err());
    }
}
