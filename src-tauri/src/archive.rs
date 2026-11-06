use crate::imaging::{NativeError, NativeJobs, validate_window_label};
use std::{fs::{self, File, OpenOptions}, io::{Read, Write}, path::Path};
use tauri_plugin_dialog::DialogExt;

const MAX_ARCHIVE_BYTES: usize = 64 * 1024 * 1024;

fn validate_container(raw: &str) -> Result<(), NativeError> {
    if raw.is_empty() || raw.len() > MAX_ARCHIVE_BYTES {
        return Err(NativeError::new("archive_limit", "Archive exceeds 64 MiB."));
    }
    let value: serde_json::Value = serde_json::from_str(raw)
        .map_err(|error| NativeError::new("invalid_archive", error.to_string()))?;
    if value.get("format").and_then(|v| v.as_str()) != Some("ferby-session")
        || value.get("version").and_then(|v| v.as_u64()) != Some(1) {
        return Err(NativeError::new("invalid_archive", "Unsupported Ferby archive format/version."));
    }
    Ok(())
}

fn read_at(path: &Path) -> Result<String, NativeError> {
    let meta = fs::symlink_metadata(path).map_err(|error| NativeError::new("archive_read", error.to_string()))?;
    if !meta.is_file() || meta.file_type().is_symlink() || meta.len() > MAX_ARCHIVE_BYTES as u64 {
        return Err(NativeError::new("archive_limit", "Choose a regular archive file up to 64 MiB."));
    }
    let file = File::open(path).map_err(|error| NativeError::new("archive_read", error.to_string()))?;
    let mut raw = String::new();
    file.take(MAX_ARCHIVE_BYTES as u64 + 1).read_to_string(&mut raw)
        .map_err(|error| NativeError::new("archive_read", error.to_string()))?;
    validate_container(&raw)?;
    Ok(raw)
}

/// Atomic single-file publication; never replaces an existing archive or symlink.
fn write_new_at(path: &Path, raw: &str) -> Result<(), NativeError> {
    validate_container(raw)?;
    let parent = path.parent().ok_or_else(|| NativeError::new("archive_path", "Choose an archive destination."))?;
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| NativeError::new("archive_write", "Clock unavailable."))?.as_nanos();
    let temp = parent.join(format!(".ferby-archive-{}-{stamp}.tmp", std::process::id()));
    let mut options = OpenOptions::new(); options.write(true).create_new(true);
    #[cfg(unix)]
    { use std::os::unix::fs::OpenOptionsExt; options.mode(0o600); }
    let mut file = options.open(&temp).map_err(|error| NativeError::new("archive_write", error.to_string()))?;
    let result = (|| {
        file.write_all(raw.as_bytes())?; file.sync_all()?; drop(file);
        fs::hard_link(&temp, path)
    })();
    let _ = fs::remove_file(&temp);
    result.map_err(|error| NativeError::new("archive_write", format!("{error} Choose a new archive filename.")))
}

#[tauri::command]
pub async fn read_local_archive(window: tauri::WebviewWindow, app: tauri::AppHandle, jobs: tauri::State<'_, NativeJobs>) -> Result<Option<String>, NativeError> {
    validate_window_label(window.label())?; let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        let Some(selected) = app.dialog().file().set_parent(&window).set_title("Import Ferby archive")
            .add_filter("Ferby archive", &["ferby"]).blocking_pick_file() else { return Ok(None); };
        let path = selected.into_path().map_err(|error| NativeError::new("archive_path", error.to_string()))?;
        read_at(&path).map(Some)
    }).await.map_err(|_| NativeError::new("worker_failed", "Archive import stopped unexpectedly."))?
}

#[tauri::command]
pub async fn write_local_archive(raw: String, window: tauri::WebviewWindow, app: tauri::AppHandle, jobs: tauri::State<'_, NativeJobs>) -> Result<bool, NativeError> {
    validate_window_label(window.label())?; let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard; validate_container(&raw)?;
        let Some(selected) = app.dialog().file().set_parent(&window).set_title("Export Ferby archive")
            .set_file_name("Session.ferby").add_filter("Ferby archive", &["ferby"]).blocking_save_file() else { return Ok(false); };
        let mut path = selected.into_path().map_err(|error| NativeError::new("archive_path", error.to_string()))?;
        if path.extension().is_none() { path.set_extension("ferby"); }
        write_new_at(&path, &raw)?; Ok(true)
    }).await.map_err(|_| NativeError::new("worker_failed", "Archive export stopped unexpectedly."))?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn archive_publication_is_non_clobbering_and_preserves_existing_file() {
        let dir = tempfile::tempdir().unwrap(); let path = dir.path().join("session.ferby");
        let raw = r#"{"format":"ferby-session","version":1,"entries":[]}"#;
        write_new_at(&path, raw).unwrap(); assert_eq!(read_at(&path).unwrap(), raw);
        assert!(write_new_at(&path, raw).is_err()); assert_eq!(fs::read_to_string(&path).unwrap(), raw);
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
    #[test]
    fn malformed_container_cannot_create_a_destination() {
        let dir = tempfile::tempdir().unwrap(); let path = dir.path().join("bad.ferby");
        assert!(write_new_at(&path, "{}").is_err()); assert!(!path.exists());
        assert!(validate_container(r#"{"format":"ferby-session","version":2}"#).is_err());
    }
    #[cfg(unix)]
    #[test]
    fn symlink_archive_is_not_read_or_overwritten() {
        let dir = tempfile::tempdir().unwrap(); let target = dir.path().join("target");
        fs::write(&target, "preserve").unwrap(); let path = dir.path().join("link.ferby");
        std::os::unix::fs::symlink(&target, &path).unwrap();
        assert!(read_at(&path).is_err());
        assert!(write_new_at(&path, r#"{"format":"ferby-session","version":1}"#).is_err());
        assert_eq!(fs::read_to_string(target).unwrap(), "preserve");
    }
}
