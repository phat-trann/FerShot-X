use crate::{application_preferences::{self, Document}, imaging::{self, NativeError}, preferences::PreferenceGate};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Destination { pub(crate) folder: Option<PathBuf>, pub(crate) basename: String }
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Envelope { version: u8, destination: Destination }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DestinationView { folder_label: Option<String>, basename: String }
fn error(reason: impl ToString) -> NativeError { NativeError::new("export_destination_failed", reason.to_string()) }

impl Destination {
    fn validate(&self) -> Result<(), NativeError> {
        imaging::validate_name(&self.basename)?;
        if self.basename.trim().is_empty() || self.basename.trim() == "." || self.basename.trim() == ".." || self.basename.chars().count() > 80 {
            return Err(error("Choose a basename of1–80 visible characters."));
        }
        if self.folder.as_ref().is_some_and(|folder| !folder.is_absolute()) { return Err(error("Saved export folder must be absolute.")); }
        Ok(())
    }
    fn view(&self) -> DestinationView {
        DestinationView { folder_label: self.folder.as_ref().map(|folder| folder.file_name().unwrap_or(folder.as_os_str()).to_string_lossy().into_owned()), basename: self.basename.clone() }
    }
}
pub(crate) fn load(path: &Path) -> Result<Destination, NativeError> {
    let Some(raw) = application_preferences::read_document(path, Document::ExportDestination)? else {
        return Ok(Destination { folder: None, basename: "Capture".into() });
    };
    let envelope: Envelope = serde_json::from_slice(&raw).map_err(error)?;
    if envelope.version != 1 { return Err(error("Unsupported destination preference version.")); }
    envelope.destination.validate()?; Ok(envelope.destination)
}
fn save(path: &Path, destination: &Destination) -> Result<DestinationView, NativeError> {
    destination.validate()?;
    let raw = serde_json::to_vec(&Envelope { version: 1, destination: destination.clone() }).map_err(error)?;
    application_preferences::write_document(path, Document::ExportDestination, &raw)?; Ok(destination.view())
}

#[tauri::command]
pub async fn read_export_destination(window: tauri::WebviewWindow, app: tauri::AppHandle,
    gate: tauri::State<'_, PreferenceGate>) -> Result<DestinationView, NativeError> {
    imaging::validate_window_label(window.label())?;
    let path = app.path().app_config_dir().map_err(error)?; let gate = gate.shared();
    tauri::async_runtime::spawn_blocking(move || { let _guard = gate.lock().map_err(|_| error("Preferences unavailable."))?; Ok(load(&path)?.view()) })
        .await.map_err(|_| error("Destination loading stopped unexpectedly."))?
}

#[tauri::command]
pub async fn choose_export_directory(window: tauri::WebviewWindow, app: tauri::AppHandle,
    gate: tauri::State<'_, PreferenceGate>) -> Result<DestinationView, NativeError> {
    imaging::validate_window_label(window.label())?;
    let path = app.path().app_config_dir().map_err(error)?; let gate = gate.shared();
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app.dialog().file().set_parent(&window).set_title("Choose image export folder").blocking_pick_folder();
        let _guard = gate.lock().map_err(|_| error("Preferences unavailable."))?;
        let mut destination = load(&path)?;
        let Some(selected) = selected else { return Ok(destination.view()); };
        let folder = selected.into_path().map_err(error)?.canonicalize().map_err(error)?;
        if !folder.is_dir() { return Err(error("Choose a directory.")); }
        destination.folder = Some(folder); save(&path, &destination)
    }).await.map_err(|_| error("Folder selection stopped unexpectedly."))?
}

#[tauri::command]
pub async fn update_export_destination(basename: Option<String>, clear_folder: bool, window: tauri::WebviewWindow,
    app: tauri::AppHandle, gate: tauri::State<'_, PreferenceGate>) -> Result<DestinationView, NativeError> {
    imaging::validate_window_label(window.label())?;
    let path = app.path().app_config_dir().map_err(error)?; let gate = gate.shared();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = gate.lock().map_err(|_| error("Preferences unavailable."))?; let mut destination = load(&path)?;
        if let Some(basename) = basename { destination.basename = basename; }
        if clear_folder { destination.folder = None; }
        save(&path, &destination)
    }).await.map_err(|_| error("Destination update stopped unexpectedly."))?
}

pub(crate) fn save_to_folder(raster: &ferby_image_core::Raster, destination: &Destination,
    format: ferby_image_core::ExportFormat, extension: &str) -> Result<Option<String>, NativeError> {
    let Some(folder) = &destination.folder else { return Ok(None); };
    let metadata = std::fs::symlink_metadata(folder).map_err(error)?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() || folder.canonicalize().map_err(error)? != *folder {
        return Err(error("The selected export folder changed. Choose it again."));
    }
    for suffix in 0..1000 {
        let name = if suffix == 0 { format!("{}.{}", destination.basename, extension) } else { format!("{}-{}.{}", destination.basename, suffix, extension) };
        let path = folder.join(name);
        match std::fs::symlink_metadata(&path) {
            Ok(_) => continue,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => (),
            Err(e) => return Err(error(e)),
        }
        match raster.save_new(&path, format) {
            Ok(()) => return Ok(Some(path.to_string_lossy().into_owned())),
            Err(ferby_image_core::TransformError::Io(e)) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(error(e)),
        }
    }
    Err(error("The export name collision limit was reached. Change the basename or folder."))
}
