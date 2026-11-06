use crate::imaging::{NativeError, NativeJobs, validate_window_label};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use serde::Serialize;
use std::{collections::VecDeque, fs::File, io::Read, path::PathBuf, sync::Mutex};
use tauri::{Emitter, Manager};

const MAX_BYTES: u64 = 20 * 1024 * 1024;
#[derive(Clone)]
struct Entry { id: String, name: String, path: PathBuf }
#[derive(Default)]
struct Queue { entries: VecDeque<Entry>, sequence: u64 }
#[derive(Default)]
pub struct DocumentOpenStore(Mutex<Queue>);
#[derive(Serialize)]
pub struct PendingDocument { id: String, name: String }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentBytes { name: String, mime_type: &'static str, base64: String }
fn error(reason: impl ToString) -> NativeError { NativeError::new("document_open_failed", reason.to_string()) }

pub fn on_event(app: &tauri::AppHandle, event: &tauri::RunEvent) {
    #[cfg(target_os = "macos")]
    if let tauri::RunEvent::Opened { urls } = event {
        let store = app.state::<DocumentOpenStore>();
        let Ok(mut queue) = store.0.lock() else { return; };
        for url in urls.iter().take(16) {
            if queue.entries.len() >= 16 { break; }
            if url.scheme() != "file" || url.as_str().len() > 8192 { continue; }
            let Ok(path) = url.to_file_path() else { continue; };
            if !path.is_absolute() || queue.entries.iter().any(|entry| entry.path == path) { continue; }
            let name = path.file_name().map(|name| name.to_string_lossy().chars().take(240).collect()).unwrap_or_else(|| "Opened image".into());
            queue.sequence = queue.sequence.wrapping_add(1);
            let id = format!("opened-document-{}", queue.sequence);
            queue.entries.push_back(Entry { id, name, path });
        }
        drop(queue);
        if let Some(main) = app.get_webview_window("main") { let _ = main.emit("ferby-documents-pending", ()); }
    }
    #[cfg(not(target_os = "macos"))] let _ = (app, event);
}

#[tauri::command]
pub fn pending_documents(window: tauri::WebviewWindow, store: tauri::State<'_, DocumentOpenStore>) -> Result<Vec<PendingDocument>, NativeError> {
    validate_window_label(window.label())?;
    let queue = store.0.lock().map_err(|_| error("Document queue unavailable."))?;
    Ok(queue.entries.iter().map(|entry| PendingDocument { id: entry.id.clone(), name: entry.name.clone() }).collect())
}

fn read(entry: Entry) -> Result<DocumentBytes, NativeError> {
    let before = std::fs::symlink_metadata(&entry.path).map_err(error)?;
    if !before.is_file() || before.file_type().is_symlink() || before.len() == 0 || before.len() > MAX_BYTES {
        return Err(error("Choose a regular nonsymlink image file no larger than 20 MiB."));
    }
    let file = File::open(&entry.path).map_err(error)?;
    let metadata = file.metadata().map_err(error)?;
    if !metadata.is_file() || metadata.len() > MAX_BYTES { return Err(error("Image file changed before reading.")); }
    #[cfg(unix)] {
        use std::os::unix::fs::MetadataExt;
        let current = std::fs::symlink_metadata(&entry.path).map_err(error)?;
        if current.file_type().is_symlink() || current.ino() != metadata.ino() || current.dev() != metadata.dev() ||
            before.ino() != metadata.ino() || before.dev() != metadata.dev() { return Err(error("Image file changed before reading.")); }
    }
    let mut bytes = Vec::new(); file.take(MAX_BYTES + 1).read_to_end(&mut bytes).map_err(error)?;
    if bytes.len() as u64 > MAX_BYTES { return Err(error("Image file exceeds 20 MiB.")); }
    let mime_type = if bytes.starts_with(b"\x89PNG\r\n\x1a\n") { "image/png" }
        else if bytes.starts_with(&[0xff, 0xd8, 0xff]) { "image/jpeg" }
        else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") { "image/gif" }
        else if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" { "image/webp" }
        else { return Err(error("Choose a PNG, JPEG, WebP or GIF image.")); };
    Ok(DocumentBytes { name: entry.name, mime_type, base64: STANDARD.encode(bytes) })
}

#[tauri::command]
pub async fn read_open_document(id: String, window: tauri::WebviewWindow, store: tauri::State<'_, DocumentOpenStore>,
    jobs: tauri::State<'_, NativeJobs>) -> Result<DocumentBytes, NativeError> {
    validate_window_label(window.label())?;
    let guard = jobs.acquire()?;
    let entry = store.0.lock().map_err(|_| error("Document queue unavailable."))?.entries.iter()
        .find(|entry| entry.id == id).cloned().ok_or_else(|| error("Document request is no longer available."))?;
    tauri::async_runtime::spawn_blocking(move || { let _guard = guard; read(entry) }).await.map_err(|_| error("Image reading stopped unexpectedly."))?
}

#[tauri::command]
pub fn acknowledge_document(id: String, window: tauri::WebviewWindow, store: tauri::State<'_, DocumentOpenStore>) -> Result<(), NativeError> {
    validate_window_label(window.label())?;
    store.0.lock().map_err(|_| error("Document queue unavailable."))?.entries.retain(|entry| entry.id != id);
    Ok(())
}
