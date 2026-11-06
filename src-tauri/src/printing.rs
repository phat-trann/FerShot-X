use crate::imaging::{self, ImagePayload, NativeError, NativeJobs};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::{Arc, Mutex, atomic::{AtomicU64, Ordering}}};

static NEXT_PRINT: AtomicU64 = AtomicU64::new(1);
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Paper { A4, Letter }
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Orientation { Portrait, Landscape }
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScaleMode { Fit, Actual }
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PrintOptions {
    image_width: u32, image_height: u32, paper: Paper, orientation: Orientation,
    margin_pt: f64, scale_mode: Option<ScaleMode>,
}
#[derive(Clone, Serialize)]
pub struct PrintDocument { image: ImagePayload, options: PrintOptions }
#[derive(Default, Clone)]
pub struct PrintStore(Arc<Mutex<HashMap<String, Arc<PrintDocument>>>>);
impl PrintStore {
    fn get(&self, label: &str) -> Result<Arc<PrintDocument>, NativeError> {
        self.0.lock().map_err(|_| NativeError::new("print_failed", "Print state unavailable."))?
            .get(label).cloned().ok_or_else(|| NativeError::new("forbidden_window", "This window has no print document."))
    }
    fn insert(&self, label: String, document: PrintDocument) -> Result<(), NativeError> {
        let mut store = self.0.lock().map_err(|_| NativeError::new("print_failed", "Print state unavailable."))?;
        if !store.is_empty() { return Err(NativeError::new("print_busy", "Close the existing print preview first.")); }
        store.insert(label, Arc::new(document)); Ok(())
    }
    fn remove(&self, label: &str) { if let Ok(mut store) = self.0.lock() { store.remove(label); } }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PrintRequest { png_base64: String, options: PrintOptions }

fn prepare(request: PrintRequest) -> Result<PrintDocument, NativeError> {
    let image = imaging::payload(imaging::decode_input(&request.png_base64)?)?;
    if request.options.image_width != image.width || request.options.image_height != image.height
        || !request.options.margin_pt.is_finite() || !(0.0..=144.0).contains(&request.options.margin_pt) {
        return Err(NativeError::new("invalid_print", "Print dimensions/margins do not match the supplied image."));
    }
    Ok(PrintDocument { image, options: request.options })
}

#[tauri::command]
pub async fn open_print_preview(request: PrintRequest, window: tauri::WebviewWindow, app: tauri::AppHandle,
    store: tauri::State<'_, PrintStore>, jobs: tauri::State<'_, NativeJobs>) -> Result<String, NativeError> {
    imaging::validate_window_label(window.label())?;
    let guard = jobs.acquire()?;
    let document = tauri::async_runtime::spawn_blocking(move || { let _guard = guard; prepare(request) })
        .await.map_err(|_| NativeError::new("worker_failed", "Print preparation stopped unexpectedly."))??;
    let label = format!("print-{}", NEXT_PRINT.fetch_add(1, Ordering::Relaxed));
    store.insert(label.clone(), document)?;
    let created = tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App("index.html?print=1".into()))
        .title("Ferby print preview").inner_size(850.0, 850.0).min_inner_size(500.0, 400.0).build();
    let child = match created { Ok(child) => child, Err(error) => { store.remove(&label); return Err(NativeError::new("print_failed", error.to_string())); } };
    let owned = store.inner().clone(); let closing = label.clone();
    child.on_window_event(move |event| { if matches!(event, tauri::WindowEvent::Destroyed) { owned.remove(&closing); } });
    Ok(label)
}

#[tauri::command]
pub async fn get_print_preview(window: tauri::WebviewWindow, store: tauri::State<'_, PrintStore>) -> Result<PrintDocument, NativeError> {
    let document = store.get(window.label())?;
    tauri::async_runtime::spawn_blocking(move || document.as_ref().clone()).await
        .map_err(|_| NativeError::new("worker_failed", "Print preview loading stopped unexpectedly."))
}

#[tauri::command]
pub fn print_preview(window: tauri::WebviewWindow, store: tauri::State<'_, PrintStore>, jobs: tauri::State<'_, NativeJobs>) -> Result<(), NativeError> {
    store.get(window.label())?; let _guard = jobs.acquire()?;
    window.print().map_err(|error| NativeError::new("print_failed", error.to_string()))
}

#[tauri::command]
pub fn close_print_preview(window: tauri::WebviewWindow, store: tauri::State<'_, PrintStore>) -> Result<(), NativeError> {
    store.get(window.label())?;
    window.close().map_err(|error| NativeError::new("print_failed", error.to_string()))?;
    // Keep the lease until the window actually emits Destroyed.
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    const PNG: &str = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";
    fn request() -> PrintRequest { PrintRequest { png_base64: PNG.into(), options: PrintOptions { image_width: 2, image_height: 2,
        paper: Paper::Letter, orientation: Orientation::Portrait, margin_pt: 36.0, scale_mode: Some(ScaleMode::Fit) } } }
    #[test]
    fn preparation_checks_actual_raster_dimensions_and_margins() {
        assert!(prepare(request()).is_ok());
        let mut bad = request(); bad.options.image_width = 3; assert!(prepare(bad).is_err());
        let mut bad = request(); bad.options.margin_pt = 145.0; assert!(prepare(bad).is_err());
    }
    #[test]
    fn store_is_bounded_label_owned_and_released() {
        let store = PrintStore::default();
        assert!(store.get("main").is_err());
        store.insert("print-1".into(), prepare(request()).unwrap()).unwrap();
        assert!(store.insert("print-2".into(), prepare(request()).unwrap()).is_err());
        assert!(store.get("print-other").is_err()); store.remove("print-1");
        assert!(store.insert("print-2".into(), prepare(request()).unwrap()).is_ok());
    }
}
