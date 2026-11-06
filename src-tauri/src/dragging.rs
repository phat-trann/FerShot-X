use crate::imaging::{self, NativeError, NativeJobs};
use ferby_image_core::ExportFormat;
use serde::Deserialize;
use std::{collections::VecDeque, fs::{self, OpenOptions}, io::Write, path::PathBuf,
    sync::{Arc, Mutex, atomic::{AtomicU64, Ordering}}};

static SEQUENCE: AtomicU64 = AtomicU64::new(1);
struct Prepared { token: String, directory: PathBuf, file: PathBuf, icon: Vec<u8> }
impl Drop for Prepared {
    fn drop(&mut self) { let _ = fs::remove_file(&self.file); let _ = fs::remove_dir(&self.directory); }
}
#[derive(Default)]
struct State { prepared: Option<Arc<Prepared>>, active: bool, recent: VecDeque<Arc<Prepared>> }
#[derive(Default, Clone)]
pub struct DragStore(Arc<Mutex<State>>);

fn error(reason: impl ToString) -> NativeError { NativeError::new("drag_failed", reason.to_string()) }
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PrepareRequest { png_base64: String, name: String }

fn prepare(request: PrepareRequest) -> Result<Prepared, NativeError> {
    imaging::validate_name(&request.name)?;
    if !request.name.to_ascii_lowercase().ends_with(".png") { return Err(error("Drag image must have a PNG filename.")); }
    let raster = imaging::decode_input(&request.png_base64)?;
    let bytes = raster.encode(ExportFormat::Png).map_err(error)?;
    if bytes.len() > ferby_image_core::MAX_INPUT_BYTES { return Err(error("Drag image exceeds the native byte budget.")); }
    let icon = raster.resize(128, 128).map_err(error)?.encode(ExportFormat::Png).map_err(error)?;
    let time = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(error)?.as_nanos();
    let token = format!("drag-{}-{}-{}", std::process::id(), time, SEQUENCE.fetch_add(1, Ordering::Relaxed));
    let directory = std::env::temp_dir().join(format!("ferby-{token}"));
    let mut builder = fs::DirBuilder::new();
    #[cfg(unix)] { use std::os::unix::fs::DirBuilderExt; builder.mode(0o700); }
    builder.create(&directory).map_err(error)?;
    let document = Prepared { file: directory.join(&request.name), directory, token, icon };
    let mut options = OpenOptions::new(); options.create_new(true).write(true);
    #[cfg(unix)] { use std::os::unix::fs::OpenOptionsExt; options.mode(0o600); }
    let mut file = options.open(&document.file).map_err(error)?;
    file.write_all(&bytes).map_err(error)?; file.sync_all().map_err(error)?;
    Ok(document)
}

#[tauri::command]
pub async fn prepare_drag_image(request: PrepareRequest, window: tauri::WebviewWindow,
    store: tauri::State<'_, DragStore>, jobs: tauri::State<'_, NativeJobs>) -> Result<String, NativeError> {
    imaging::validate_window_label(window.label())?;
    if !cfg!(target_os = "macos") { return Err(error("Native image drag is available on macOS.")); }
    let guard = jobs.acquire()?;
    let owned = store.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        let document = Arc::new(prepare(request)?);
        let token = document.token.clone();
        let mut state = owned.0.lock().map_err(|_| error("Drag state unavailable."))?;
        if state.active { return Err(error("Finish the current drag first.")); }
        state.prepared = Some(document); Ok(token)
    }).await.map_err(|_| error("Drag preparation stopped unexpectedly."))?
}

#[tauri::command]
pub fn discard_prepared_drag(token: String, window: tauri::WebviewWindow, store: tauri::State<'_, DragStore>) -> Result<(), NativeError> {
    imaging::validate_window_label(window.label())?;
    let mut state = store.0.lock().map_err(|_| error("Drag state unavailable."))?;
    if !state.active && state.prepared.as_ref().is_some_and(|document| document.token == token) { state.prepared = None; }
    Ok(())
}

#[cfg(target_os = "macos")]
fn finish(store: &DragStore, token: &str, retain: bool) {
    if let Ok(mut state) = store.0.lock() {
        if state.prepared.as_ref().is_some_and(|document| document.token == token) {
            state.active = false;
            if retain {
                if let Some(document) = state.prepared.take() { state.recent.push_back(document); }
                // Keep a bounded grace window of completed exports for asynchronous file consumers.
                while state.recent.len() > 4 { state.recent.pop_front(); }
            }
        }
    }
}

#[tauri::command]
pub async fn start_prepared_drag(token: String, window: tauri::WebviewWindow,
    store: tauri::State<'_, DragStore>, jobs: tauri::State<'_, NativeJobs>) -> Result<bool, NativeError> {
    imaging::validate_window_label(window.label())?;
    #[cfg(not(target_os = "macos"))]
    { let _ = (token, store, jobs); Err(error("Native image drag is available on macOS.")) }
    #[cfg(target_os = "macos")]
    {
        let _guard = jobs.acquire()?;
        let document = {
            let mut state = store.0.lock().map_err(|_| error("Drag state unavailable."))?;
            if state.active { return Err(error("A drag is already active.")); }
            let document = state.prepared.as_ref().filter(|document| document.token == token).cloned()
                .ok_or_else(|| error("Prepare the current image before dragging."))?;
            state.active = true; document
        };
        let owned = store.inner().clone(); let failed = owned.clone();
        let drag_window = window.clone();
        let (sender, receiver) = std::sync::mpsc::channel();
        let queued = window.run_on_main_thread(move || {
            let callback_sender = sender.clone(); let callback_store = owned.clone(); let callback_token = document.token.clone();
            let result = drag::start_drag(&drag_window, drag::DragItem::Files(vec![document.file.clone()]), drag::Image::Raw(document.icon.clone()),
                move |result, _position| {
                    let dropped = matches!(result, drag::DragResult::Dropped);
                    finish(&callback_store, &callback_token, true);
                    let _ = callback_sender.send(Ok(dropped));
                }, drag::Options::default());
            if let Err(reason) = result { finish(&owned, &document.token, false); let _ = sender.send(Err(error(reason))); }
        });
        if let Err(reason) = queued { finish(&failed, &token, false); return Err(error(reason)); }
        tauri::async_runtime::spawn_blocking(move || receiver.recv().map_err(|_| error("Native drag session ended without a result."))?)
            .await.map_err(|_| error("Native drag session stopped unexpectedly."))?
    }
}

pub fn clear_on_close(store: &DragStore) -> Result<(), NativeError> {
    let mut state = store.0.lock().map_err(|_| error("Drag state unavailable."))?;
    if state.active { return Err(error("Finish dragging before closing the workspace.")); }
    state.prepared = None; state.recent.clear(); Ok(())
}
