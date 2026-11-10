//! Standalone versioned local session archive manifest and bounded image store (`A29`).
//!
//! This local archive is a FerShot-owned persistence design for an explicit caller-provided
//! directory and image bytes; it does not claim or touch reference application storage or scan arbitrary
//! filesystem directories.
//!
//! # Proposed Root Integration (`Codex`)
//! - Expose bounded Tauri commands `load_local_session` and `save_local_session` scoped to
//!   the application's owned `app_local_data_dir()/session-archive` directory.

use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

pub const SESSION_MANIFEST_FILE_NAME: &str = "fershot-session-manifest.json";
pub const SESSION_SCHEMA_VERSION: u32 = 1;
pub const MAX_MANIFEST_BYTES: u64 = 256 * 1024;
pub const MAX_SESSION_ITEMS: usize = 64;
pub const MAX_IMAGE_FILE_BYTES: usize = 16 * 1024 * 1024;
pub const MAX_TOTAL_ARCHIVE_BYTES: usize = 64 * 1024 * 1024;
pub const MAX_IMAGE_DIMENSION: u32 = 16_384;
pub const MAX_TOKEN_LEN: usize = 128;

static TEMP_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SessionItemMetadata {
    pub id: String,
    pub name: String,
    pub file_name: String,
    pub width: u32,
    pub height: u32,
    pub mime_type: String,
    pub byte_size: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SessionManifest {
    pub version: u32,
    pub selected_id: Option<String>,
    pub items: Vec<SessionItemMetadata>,
}

impl Default for SessionManifest {
    fn default() -> Self {
        Self {
            version: SESSION_SCHEMA_VERSION,
            selected_id: None,
            items: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionArchiveInput {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub mime_type: String,
    pub image_bytes: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionLoadedItem {
    pub metadata: SessionItemMetadata,
    pub image_bytes: Vec<u8>,
}

#[derive(Deserialize)]
struct VersionProbe {
    version: Option<u32>,
}

#[derive(Debug, Error)]
pub enum SessionError {
    #[error("session directory path must not be empty")]
    EmptyDirectoryPath,

    #[error("refusing to operate on symlink path: {0}")]
    SymlinkRejected(PathBuf),

    #[error("session path is not a directory: {0}")]
    NotADirectory(PathBuf),

    #[error("session target is not a regular file: {0}")]
    NonRegularTarget(PathBuf),

    #[error("path traversal or unsafe token rejected: {0}")]
    PathTraversalRejected(String),

    #[error("unsupported session manifest version: {0} (expected {SESSION_SCHEMA_VERSION})")]
    UnsupportedVersion(u32),

    #[error("manifest file size ({size} bytes) exceeds maximum ({max} bytes)")]
    ManifestTooLarge { size: u64, max: u64 },

    #[error("session item count ({0}) exceeds maximum ({MAX_SESSION_ITEMS})")]
    TooManyItems(usize),

    #[error("duplicate session item id: {0}")]
    DuplicateItemId(String),

    #[error("selected_id '{0}' does not match any session item")]
    UnknownSelectedId(String),

    #[error("invalid item dimensions ({width}x{height})")]
    InvalidDimensions { width: u32, height: u32 },

    #[error("invalid or mismatched image MIME/bytes for item '{0}'")]
    InvalidImagePayload(String),

    #[error("image byte size ({size}) exceeds limit ({max})")]
    ImageBytesTooLarge { size: usize, max: usize },

    #[error("malformed session manifest JSON: {0}")]
    MalformedManifest(String),

    #[error("I/O error at {path}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
}

pub fn validate_safe_id(id: &str) -> Result<(), SessionError> {
    if id.is_empty()
        || id.len() > MAX_TOKEN_LEN
        || id.starts_with('.')
        || id.contains("..")
        || !id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
    {
        return Err(SessionError::PathTraversalRejected(id.to_string()));
    }
    Ok(())
}

pub fn validate_flat_file_name(file_name: &str) -> Result<(), SessionError> {
    if file_name.is_empty()
        || file_name.len() > MAX_TOKEN_LEN
        || file_name.starts_with('.')
        || file_name.contains("..")
        || file_name.contains('/')
        || file_name.contains('\\')
        || !file_name
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.')
    {
        return Err(SessionError::PathTraversalRejected(file_name.to_string()));
    }
    Ok(())
}

fn extension_for_mime_and_bytes(id: &str, mime_type: &str, bytes: &[u8]) -> Result<&'static str, SessionError> {
    match mime_type {
        "image/png" => {
            if !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
                return Err(SessionError::InvalidImagePayload(id.to_string()));
            }
            Ok("png")
        }
        "image/jpeg" => {
            if !bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
                return Err(SessionError::InvalidImagePayload(id.to_string()));
            }
            Ok("jpg")
        }
        _ => Err(SessionError::InvalidImagePayload(id.to_string())),
    }
}

fn validate_directory_no_symlink(dir: &Path, create_if_missing: bool) -> Result<(), SessionError> {
    if dir.as_os_str().is_empty() {
        return Err(SessionError::EmptyDirectoryPath);
    }
    match fs::symlink_metadata(dir) {
        Ok(meta) => {
            if meta.file_type().is_symlink() {
                return Err(SessionError::SymlinkRejected(dir.to_path_buf()));
            }
            if !meta.file_type().is_dir() {
                return Err(SessionError::NotADirectory(dir.to_path_buf()));
            }
            Ok(())
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            if create_if_missing {
                fs::create_dir_all(dir).map_err(|source| SessionError::Io {
                    path: dir.to_path_buf(),
                    source,
                })?;
                let meta = fs::symlink_metadata(dir).map_err(|source| SessionError::Io {
                    path: dir.to_path_buf(),
                    source,
                })?;
                if meta.file_type().is_symlink() {
                    return Err(SessionError::SymlinkRejected(dir.to_path_buf()));
                }
                if !meta.file_type().is_dir() {
                    return Err(SessionError::NotADirectory(dir.to_path_buf()));
                }
            }
            Ok(())
        }
        Err(source) => Err(SessionError::Io {
            path: dir.to_path_buf(),
            source,
        }),
    }
}

fn inspect_regular_target(target: &Path) -> Result<Option<fs::Metadata>, SessionError> {
    match fs::symlink_metadata(target) {
        Ok(meta) => {
            if meta.file_type().is_symlink() {
                return Err(SessionError::SymlinkRejected(target.to_path_buf()));
            }
            if !meta.file_type().is_file() {
                return Err(SessionError::NonRegularTarget(target.to_path_buf()));
            }
            Ok(Some(meta))
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(source) => Err(SessionError::Io {
            path: target.to_path_buf(),
            source,
        }),
    }
}

fn next_temp_path(dir: &Path, label: &str) -> PathBuf {
    let pid = std::process::id();
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let seq = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
    dir.join(format!(".{label}.tmp.{pid}.{nanos}.{seq}"))
}

fn write_temp_file(temp_path: &Path, bytes: &[u8]) -> Result<(), SessionError> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(temp_path).map_err(|source| SessionError::Io {
        path: temp_path.to_path_buf(),
        source,
    })?;
    file.write_all(bytes).map_err(|source| SessionError::Io {
        path: temp_path.to_path_buf(),
        source,
    })?;
    file.sync_all().map_err(|source| SessionError::Io {
        path: temp_path.to_path_buf(),
        source,
    })?;
    Ok(())
}

/// Validates and atomically persists a local session archive inside `dir`.
///
/// Pre-existing session files remain untouched if validation or staging fails.
pub fn save_session_archive(
    dir: &Path,
    inputs: &[SessionArchiveInput],
    selected_id: Option<&str>,
) -> Result<SessionManifest, SessionError> {
    if inputs.len() > MAX_SESSION_ITEMS {
        return Err(SessionError::TooManyItems(inputs.len()));
    }

    let mut seen_ids = BTreeSet::new();
    let mut total_bytes: usize = 0;
    let mut items_meta = Vec::with_capacity(inputs.len());

    for item in inputs {
        validate_safe_id(&item.id)?;
        if !seen_ids.insert(item.id.clone()) {
            return Err(SessionError::DuplicateItemId(item.id.clone()));
        }
        if item.name.trim().is_empty() || item.name.len() > MAX_TOKEN_LEN {
            return Err(SessionError::PathTraversalRejected(item.name.clone()));
        }
        if item.width == 0
            || item.height == 0
            || item.width > MAX_IMAGE_DIMENSION
            || item.height > MAX_IMAGE_DIMENSION
        {
            return Err(SessionError::InvalidDimensions {
                width: item.width,
                height: item.height,
            });
        }
        if item.image_bytes.is_empty() {
            return Err(SessionError::InvalidImagePayload(item.id.clone()));
        }
        if item.image_bytes.len() > MAX_IMAGE_FILE_BYTES {
            return Err(SessionError::ImageBytesTooLarge {
                size: item.image_bytes.len(),
                max: MAX_IMAGE_FILE_BYTES,
            });
        }
        total_bytes = total_bytes.saturating_add(item.image_bytes.len());
        if total_bytes > MAX_TOTAL_ARCHIVE_BYTES {
            return Err(SessionError::ImageBytesTooLarge {
                size: total_bytes,
                max: MAX_TOTAL_ARCHIVE_BYTES,
            });
        }

        let ext = extension_for_mime_and_bytes(&item.id, &item.mime_type, &item.image_bytes)?;
        let file_name = format!("{}.{ext}", item.id);
        validate_flat_file_name(&file_name)?;

        items_meta.push(SessionItemMetadata {
            id: item.id.clone(),
            name: item.name.clone(),
            file_name,
            width: item.width,
            height: item.height,
            mime_type: item.mime_type.clone(),
            byte_size: item.image_bytes.len(),
        });
    }

    if let Some(sel) = selected_id {
        if !seen_ids.contains(sel) {
            return Err(SessionError::UnknownSelectedId(sel.to_string()));
        }
    }

    let manifest = SessionManifest {
        version: SESSION_SCHEMA_VERSION,
        selected_id: selected_id.map(str::to_string),
        items: items_meta,
    };

    let mut manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| SessionError::MalformedManifest(e.to_string()))?;
    manifest_json.push('\n');
    if (manifest_json.len() as u64) > MAX_MANIFEST_BYTES {
        return Err(SessionError::ManifestTooLarge {
            size: manifest_json.len() as u64,
            max: MAX_MANIFEST_BYTES,
        });
    }

    validate_directory_no_symlink(dir, true)?;
    let manifest_target = dir.join(SESSION_MANIFEST_FILE_NAME);
    let _ = inspect_regular_target(&manifest_target)?;

    for meta in &manifest.items {
        let target = dir.join(&meta.file_name);
        let _ = inspect_regular_target(&target)?;
    }

    let mut staged_pairs: Vec<(PathBuf, PathBuf)> = Vec::with_capacity(inputs.len() + 1);

    let stage_result = (|| -> Result<(), SessionError> {
        for (input, meta) in inputs.iter().zip(manifest.items.iter()) {
            let temp_img = next_temp_path(dir, &meta.file_name);
            let final_img = dir.join(&meta.file_name);
            write_temp_file(&temp_img, &input.image_bytes)?;
            staged_pairs.push((temp_img, final_img));
        }

        let temp_manifest = next_temp_path(dir, SESSION_MANIFEST_FILE_NAME);
        write_temp_file(&temp_manifest, manifest_json.as_bytes())?;
        staged_pairs.push((temp_manifest, manifest_target.clone()));

        for (_, final_target) in &staged_pairs {
            let _ = inspect_regular_target(final_target)?;
        }

        for (temp_path, final_target) in &staged_pairs {
            fs::rename(temp_path, final_target).map_err(|source| SessionError::Io {
                path: final_target.clone(),
                source,
            })?;
        }
        Ok(())
    })();

    if stage_result.is_err() {
        for (temp_path, _) in &staged_pairs {
            let _ = fs::remove_file(temp_path);
        }
        return Err(stage_result.unwrap_err());
    }

    Ok(manifest)
}

/// Parses and validates a session manifest JSON string.
pub fn parse_session_manifest_str(raw: &str) -> Result<SessionManifest, SessionError> {
    let byte_len = raw.len() as u64;
    if byte_len > MAX_MANIFEST_BYTES {
        return Err(SessionError::ManifestTooLarge {
            size: byte_len,
            max: MAX_MANIFEST_BYTES,
        });
    }

    if let Ok(probe) = serde_json::from_str::<VersionProbe>(raw) {
        if let Some(version) = probe.version {
            if version != SESSION_SCHEMA_VERSION {
                return Err(SessionError::UnsupportedVersion(version));
            }
        }
    }

    let manifest: SessionManifest = serde_json::from_str(raw)
        .map_err(|e| SessionError::MalformedManifest(e.to_string()))?;

    if manifest.version != SESSION_SCHEMA_VERSION {
        return Err(SessionError::UnsupportedVersion(manifest.version));
    }
    if manifest.items.len() > MAX_SESSION_ITEMS {
        return Err(SessionError::TooManyItems(manifest.items.len()));
    }

    let mut seen_ids = BTreeSet::new();
    let mut total_bytes: usize = 0;
    for item in &manifest.items {
        validate_safe_id(&item.id)?;
        validate_flat_file_name(&item.file_name)?;
        if !seen_ids.insert(item.id.clone()) {
            return Err(SessionError::DuplicateItemId(item.id.clone()));
        }
        if item.width == 0
            || item.height == 0
            || item.width > MAX_IMAGE_DIMENSION
            || item.height > MAX_IMAGE_DIMENSION
        {
            return Err(SessionError::InvalidDimensions {
                width: item.width,
                height: item.height,
            });
        }
        if item.byte_size == 0 || item.byte_size > MAX_IMAGE_FILE_BYTES {
            return Err(SessionError::ImageBytesTooLarge {
                size: item.byte_size,
                max: MAX_IMAGE_FILE_BYTES,
            });
        }
        total_bytes = total_bytes.saturating_add(item.byte_size);
        if total_bytes > MAX_TOTAL_ARCHIVE_BYTES {
            return Err(SessionError::ImageBytesTooLarge {
                size: total_bytes,
                max: MAX_TOTAL_ARCHIVE_BYTES,
            });
        }
    }

    if let Some(sel) = &manifest.selected_id {
        if !seen_ids.contains(sel) {
            return Err(SessionError::UnknownSelectedId(sel.clone()));
        }
    }

    Ok(manifest)
}

/// Loads the session manifest and bounded image payloads from `dir`.
pub fn load_session_archive(
    dir: &Path,
) -> Result<(SessionManifest, Vec<SessionLoadedItem>), SessionError> {
    validate_directory_no_symlink(dir, false)?;
    let manifest_path = dir.join(SESSION_MANIFEST_FILE_NAME);

    let Some(meta) = inspect_regular_target(&manifest_path)? else {
        return Ok((SessionManifest::default(), Vec::new()));
    };

    if meta.len() > MAX_MANIFEST_BYTES {
        return Err(SessionError::ManifestTooLarge {
            size: meta.len(),
            max: MAX_MANIFEST_BYTES,
        });
    }

    let file = File::open(&manifest_path).map_err(|source| SessionError::Io {
        path: manifest_path.clone(),
        source,
    })?;
    let mut buf = Vec::with_capacity((meta.len() as usize).min(MAX_MANIFEST_BYTES as usize));
    file.take(MAX_MANIFEST_BYTES + 1)
        .read_to_end(&mut buf)
        .map_err(|source| SessionError::Io {
            path: manifest_path.clone(),
            source,
        })?;
    if (buf.len() as u64) > MAX_MANIFEST_BYTES {
        return Err(SessionError::ManifestTooLarge {
            size: buf.len() as u64,
            max: MAX_MANIFEST_BYTES,
        });
    }

    let raw = std::str::from_utf8(&buf)
        .map_err(|e| SessionError::MalformedManifest(e.to_string()))?;
    let manifest = parse_session_manifest_str(raw)?;

    let mut loaded_items = Vec::with_capacity(manifest.items.len());
    for item in &manifest.items {
        let img_path = dir.join(&item.file_name);
        let Some(img_meta) = inspect_regular_target(&img_path)? else {
            return Err(SessionError::InvalidImagePayload(item.id.clone()));
        };
        if img_meta.len() != (item.byte_size as u64) {
            return Err(SessionError::InvalidImagePayload(item.id.clone()));
        }

        let img_file = File::open(&img_path).map_err(|source| SessionError::Io {
            path: img_path.clone(),
            source,
        })?;
        let mut img_bytes = Vec::with_capacity(item.byte_size);
        img_file
            .take((item.byte_size as u64) + 1)
            .read_to_end(&mut img_bytes)
            .map_err(|source| SessionError::Io {
                path: img_path.clone(),
                source,
            })?;
        if img_bytes.len() != item.byte_size {
            return Err(SessionError::InvalidImagePayload(item.id.clone()));
        }
        let _ = extension_for_mime_and_bytes(&item.id, &item.mime_type, &img_bytes)?;

        loaded_items.push(SessionLoadedItem {
            metadata: item.clone(),
            image_bytes: img_bytes,
        });
    }

    Ok((manifest, loaded_items))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn sample_png_bytes(tag: u8) -> Vec<u8> {
        let mut v = b"\x89PNG\r\n\x1a\n".to_vec();
        v.extend_from_slice(&[tag, 1, 2, 3, 4, 5, 6, 7]);
        v
    }

    #[test]
    fn round_trips_session_archive_and_preserves_caller_inputs() {
        let temp = TempDir::new().unwrap();
        let original_bytes = sample_png_bytes(42);
        let inputs = vec![SessionArchiveInput {
            id: "shot-01".to_string(),
            name: "Capture 01".to_string(),
            width: 320,
            height: 200,
            mime_type: "image/png".to_string(),
            image_bytes: original_bytes.clone(),
        }];

        let saved = save_session_archive(temp.path(), &inputs, Some("shot-01")).unwrap();
        assert_eq!(saved.version, SESSION_SCHEMA_VERSION);
        assert_eq!(saved.selected_id.as_deref(), Some("shot-01"));
        assert_eq!(saved.items.len(), 1);
        assert_eq!(inputs[0].image_bytes, original_bytes);

        let (loaded_manifest, loaded_items) = load_session_archive(temp.path()).unwrap();
        assert_eq!(loaded_manifest, saved);
        assert_eq!(loaded_items.len(), 1);
        assert_eq!(loaded_items[0].image_bytes, original_bytes);
    }

    #[test]
    fn rejects_malformed_oversized_unknown_version_and_traversal_manifests() {
        let temp = TempDir::new().unwrap();
        let manifest_path = temp.path().join(SESSION_MANIFEST_FILE_NAME);

        // Unknown version
        fs::write(
            &manifest_path,
            br#"{"version": 9, "selectedId": null, "items": []}"#,
        )
        .unwrap();
        assert!(matches!(
            load_session_archive(temp.path()),
            Err(SessionError::UnsupportedVersion(9))
        ));

        // Path traversal in fileName
        fs::write(
            &manifest_path,
            br#"{"version": 1, "selectedId": null, "items": [{"id": "ok-1", "name": "Bad", "fileName": "../evil.png", "width": 10, "height": 10, "mimeType": "image/png", "byteSize": 16}]}"#,
        )
        .unwrap();
        assert!(matches!(
            load_session_archive(temp.path()),
            Err(SessionError::PathTraversalRejected(_))
        ));

        // Oversized manifest
        fs::write(&manifest_path, vec![b' '; (MAX_MANIFEST_BYTES as usize) + 64]).unwrap();
        assert!(matches!(
            load_session_archive(temp.path()),
            Err(SessionError::ManifestTooLarge { .. })
        ));
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlinks_and_preserves_existing_archive_on_failed_write() {
        use std::os::unix::fs::symlink;

        let temp = TempDir::new().unwrap();
        let archive_dir = temp.path().join("archive");
        let valid_inputs = vec![SessionArchiveInput {
            id: "item-1".to_string(),
            name: "First".to_string(),
            width: 100,
            height: 80,
            mime_type: "image/png".to_string(),
            image_bytes: sample_png_bytes(1),
        }];
        save_session_archive(&archive_dir, &valid_inputs, Some("item-1")).unwrap();

        // Failed write (invalid traversal id) preserves existing archive
        let bad_inputs = vec![SessionArchiveInput {
            id: "../escape".to_string(),
            name: "Escape".to_string(),
            width: 100,
            height: 80,
            mime_type: "image/png".to_string(),
            image_bytes: sample_png_bytes(2),
        }];
        assert!(matches!(
            save_session_archive(&archive_dir, &bad_inputs, None),
            Err(SessionError::PathTraversalRejected(_))
        ));

        // Symlinked image target inside archive_dir is rejected and cleaned up
        let outside = temp.path().join("outside.png");
        fs::write(&outside, b"outside").unwrap();
        symlink(&outside, archive_dir.join("item-2.png")).unwrap();

        let symlink_collision = vec![SessionArchiveInput {
            id: "item-2".to_string(),
            name: "Second".to_string(),
            width: 100,
            height: 80,
            mime_type: "image/png".to_string(),
            image_bytes: sample_png_bytes(3),
        }];
        assert!(matches!(
            save_session_archive(&archive_dir, &symlink_collision, None),
            Err(SessionError::SymlinkRejected(_))
        ));
        assert_eq!(fs::read(&outside).unwrap(), b"outside");
        fs::remove_file(archive_dir.join("item-2.png")).unwrap();

        // Original archive is still intact
        let (loaded_manifest, loaded_items) = load_session_archive(&archive_dir).unwrap();
        assert_eq!(loaded_manifest.items.len(), 1);
        assert_eq!(loaded_items[0].metadata.id, "item-1");
    }
}

