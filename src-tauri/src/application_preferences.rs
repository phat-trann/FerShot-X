use crate::imaging::NativeError;
use fershot_settings_core::AppSettings;
use serde::{Deserialize, Serialize};
use std::{fs::{self, File, OpenOptions}, io::{Read, Write}, path::Path, sync::atomic::{AtomicU64, Ordering}};

const FILE_NAME: &str = "fershot-application-preferences.json";
const MAX_BYTES: u64 = 16_384;
static SEQUENCE: AtomicU64 = AtomicU64::new(0);

pub enum Document { Application, Shortcuts, ExportDestination, CaptureUpload, UpdateSchedule, ScrollCapture }
impl Document {
    fn name(&self) -> &'static str { match self { Self::Application => FILE_NAME, Self::ScrollCapture => "fershot-scroll-capture.json", Self::UpdateSchedule => "fershot-update-schedule.json", Self::CaptureUpload => "fershot-capture-upload.json", Self::Shortcuts => "fershot-shortcuts.json", Self::ExportDestination => "fershot-export-destination.json" } }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PostCaptureBehavior { OpenEditor, ShowPreview, CopyOnly, SaveOnly }

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ApplicationPreferences {
    pub post_capture_behavior: PostCaptureBehavior,
    pub default_zoom_percent: u16,
    pub keep_editor_always_on_top: bool,
    pub show_system_notifications: bool,
    pub launch_at_login: bool,
    pub show_in_menu_bar: bool,
    pub base_settings: AppSettings,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Envelope { version: u8, preferences: ApplicationPreferences }

fn error(reason: impl ToString) -> NativeError { NativeError::new("settings_failed", reason.to_string()) }

impl ApplicationPreferences {
    pub fn validate(&self) -> Result<(), NativeError> {
        if !(25..=400).contains(&self.default_zoom_percent) { return Err(error("Default zoom must be between 25 and 400 percent.")); }
        self.base_settings.validate().map_err(error)
    }

    pub fn defaults(base_settings: AppSettings) -> Self {
        Self { post_capture_behavior: PostCaptureBehavior::OpenEditor, default_zoom_percent: 100,
            keep_editor_always_on_top: false, show_system_notifications: true, launch_at_login: false,
            show_in_menu_bar: true, base_settings }
    }
}

fn check_directory(dir: &Path, create: bool) -> Result<bool, NativeError> {
    match fs::symlink_metadata(dir) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            if !create { return Ok(false); }
            fs::create_dir_all(dir).map_err(error)?;
        }
        Err(e) => return Err(error(e)),
        Ok(_) => (),
    }
    let metadata = fs::symlink_metadata(dir).map_err(error)?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() { return Err(error("Invalid application settings directory.")); }
    Ok(true)
}

fn check_file(path: &Path) -> Result<bool, NativeError> {
    match fs::symlink_metadata(path) {
        Ok(m) if m.is_file() && !m.file_type().is_symlink() && m.len() <= MAX_BYTES => Ok(true),
        Ok(_) => Err(error("Application preferences must be a regular file no larger than 16 KiB.")),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(error(e)),
    }
}

pub fn load_optional(dir: &Path) -> Result<Option<ApplicationPreferences>, NativeError> {
    let Some(raw) = read_document(dir, Document::Application)? else { return Ok(None); };
    let envelope: Envelope = serde_json::from_slice(&raw).map_err(error)?;
    if envelope.version != 1 { return Err(error("Unsupported application preferences version.")); }
    envelope.preferences.validate()?;
    Ok(Some(envelope.preferences))
}

pub fn read_document(dir: &Path, document: Document) -> Result<Option<Vec<u8>>, NativeError> {
    if !check_directory(dir, false)? { return Ok(None); }
    let path = dir.join(document.name());
    if !check_file(&path)? { return Ok(None); }
    let mut raw = Vec::new();
    File::open(&path).map_err(error)?.take(MAX_BYTES + 1).read_to_end(&mut raw).map_err(error)?;
    if raw.len() as u64 > MAX_BYTES { return Err(error("Application preferences exceed 16 KiB.")); }
    Ok(Some(raw))
}

pub fn save(dir: &Path, preferences: &ApplicationPreferences) -> Result<(), NativeError> {
    preferences.validate()?;
    let raw = serde_json::to_vec(&Envelope { version: 1, preferences: preferences.clone() }).map_err(error)?;
    write_document(dir, Document::Application, &raw)
}

pub fn write_document(dir: &Path, document: Document, raw: &[u8]) -> Result<(), NativeError> {
    if raw.len() as u64 > MAX_BYTES { return Err(error("Application preferences exceed 16 KiB.")); }
    check_directory(dir, true)?;
    let name = document.name();
    let target = dir.join(name);
    check_file(&target)?;
    let time = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(error)?.as_nanos();
    let temp = dir.join(format!(".{name}.{}.{}.{}", std::process::id(), time, SEQUENCE.fetch_add(1, Ordering::Relaxed)));
    let mut options = OpenOptions::new(); options.write(true).create_new(true);
    #[cfg(unix)] { use std::os::unix::fs::OpenOptionsExt; options.mode(0o600); }
    // Only remove a staging file successfully created by this operation.
    let mut file = options.open(&temp).map_err(error)?;
    let result = (|| {
        file.write_all(&raw).map_err(error)?; file.sync_all().map_err(error)?; drop(file);
        check_file(&target)?;
        fs::rename(&temp, &target).map_err(error)?;
        if let Ok(directory) = File::open(dir) { let _ = directory.sync_all(); }
        Ok(())
    })();
    if result.is_err() { let _ = fs::remove_file(&temp); }
    result
}
