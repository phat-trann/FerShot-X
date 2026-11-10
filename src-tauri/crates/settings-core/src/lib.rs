//! Standalone settings schema, validation, and bounded atomic persistence for FerShot X.
//!
//! # Concurrency and Atomicity Limits
//! - Writes stage a new sibling file inside the caller-supplied directory using `create_new(true)`,
//!   flush with `File::sync_all`, and replace `fershot-settings.json` via `std::fs::rename`.
//! - On POSIX filesystems (`macOS`), `rename` within the same directory is atomic with respect to
//!   concurrent readers and crash recovery, provided the underlying filesystem honors `fsync`.
//! - Concurrent writers in separate processes or threads follow a last-writer-wins policy; no
//!   cross-process advisory lock (`flock`) is held across load-modify-save cycles.
//! - Symlink checks via `std::fs::symlink_metadata` mitigate accidental traversal into symlinked
//!   files or directories, though a privileged local attacker racing directory swaps between
//!   metadata inspection and `rename` remains outside user-space atomic guarantees without `openat`
//!   `O_NOFOLLOW` directory descriptors.

use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

/// Canonical settings filename inside the caller-provided FerShot settings directory.
pub const SETTINGS_FILE_NAME: &str = "fershot-settings.json";

/// Current version of the persisted settings JSON envelope.
pub const SETTINGS_SCHEMA_VERSION: u32 = 1;

/// Maximum allowed byte size when reading a persisted settings file (16 KiB).
pub const MAX_SETTINGS_BYTES: u64 = 16 * 1024;

/// Minimum allowed JPEG quality percentage.
pub const MIN_JPEG_QUALITY: u8 = 1;

/// Maximum allowed JPEG quality percentage.
pub const MAX_JPEG_QUALITY: u8 = 100;

/// Default JPEG quality percentage matching `src/contracts/settings.ts`.
pub const DEFAULT_JPEG_QUALITY: u8 = 90;

static TEMP_COUNTER: AtomicU64 = AtomicU64::new(1);

/// Supported image save formats matching `AppSettings["saveFormat"]`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SaveFormat {
    Png,
    Jpeg,
}

/// FerShot application settings matching the frozen TypeScript `AppSettings` contract.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AppSettings {
    pub save_format: SaveFormat,
    pub jpeg_quality: u8,
    pub downscale_retina: bool,
    pub show_preview: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            save_format: SaveFormat::Png,
            jpeg_quality: DEFAULT_JPEG_QUALITY,
            downscale_retina: false,
            show_preview: true,
        }
    }
}

impl AppSettings {
    /// Validates setting invariants against the frozen contract bounds.
    pub fn validate(&self) -> Result<(), SettingsError> {
        if !(MIN_JPEG_QUALITY..=MAX_JPEG_QUALITY).contains(&self.jpeg_quality) {
            return Err(SettingsError::InvalidJpegQuality(self.jpeg_quality));
        }
        Ok(())
    }
}

/// Versioned on-disk JSON envelope for `AppSettings`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SettingsEnvelope {
    pub version: u32,
    pub settings: AppSettings,
}

/// Raw JSON probe used to distinguish unsupported version numbers from general schema errors.
#[derive(Deserialize)]
struct VersionProbe {
    version: Option<u32>,
}

/// Typed errors returned by `fershot-settings-core`.
#[derive(Debug, Error)]
pub enum SettingsError {
    #[error("settings directory path must not be empty")]
    EmptyDirectoryPath,

    #[error("refusing to operate on symlink path: {0}")]
    SymlinkRejected(PathBuf),

    #[error("settings directory path is not a directory: {0}")]
    NotADirectory(PathBuf),

    #[error("settings target is not a regular file: {0}")]
    NonRegularTarget(PathBuf),

    #[error("settings file size ({size} bytes) exceeds maximum allowed ({max} bytes)")]
    FileTooLarge { size: u64, max: u64 },

    #[error("unsupported settings schema version: {0} (expected {SETTINGS_SCHEMA_VERSION})")]
    UnsupportedVersion(u32),

    #[error(
        "invalid JPEG quality {0}; expected integer in {MIN_JPEG_QUALITY}..={MAX_JPEG_QUALITY}"
    )]
    InvalidJpegQuality(u8),

    #[error("malformed settings JSON: {0}")]
    MalformedJson(String),

    #[error("I/O error while accessing settings at {path}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
}

/// Parses and validates a versioned settings JSON string with size and bounds enforcement.
pub fn parse_settings_str(raw: &str) -> Result<AppSettings, SettingsError> {
    let byte_len = raw.len() as u64;
    if byte_len > MAX_SETTINGS_BYTES {
        return Err(SettingsError::FileTooLarge {
            size: byte_len,
            max: MAX_SETTINGS_BYTES,
        });
    }

    if let Ok(probe) = serde_json::from_str::<VersionProbe>(raw) {
        if let Some(version) = probe.version {
            if version != SETTINGS_SCHEMA_VERSION {
                return Err(SettingsError::UnsupportedVersion(version));
            }
        }
    }

    let envelope: SettingsEnvelope =
        serde_json::from_str(raw).map_err(|err| SettingsError::MalformedJson(err.to_string()))?;

    if envelope.version != SETTINGS_SCHEMA_VERSION {
        return Err(SettingsError::UnsupportedVersion(envelope.version));
    }

    envelope.settings.validate()?;
    Ok(envelope.settings)
}

/// Serializes validated `AppSettings` into a versioned pretty JSON string.
pub fn serialize_settings_string(settings: &AppSettings) -> Result<String, SettingsError> {
    settings.validate()?;
    let envelope = SettingsEnvelope {
        version: SETTINGS_SCHEMA_VERSION,
        settings: settings.clone(),
    };
    let mut encoded = serde_json::to_string_pretty(&envelope)
        .map_err(|err| SettingsError::MalformedJson(err.to_string()))?;
    encoded.push('\n');

    if (encoded.len() as u64) > MAX_SETTINGS_BYTES {
        return Err(SettingsError::FileTooLarge {
            size: encoded.len() as u64,
            max: MAX_SETTINGS_BYTES,
        });
    }
    Ok(encoded)
}

fn validate_directory_no_symlink(dir: &Path, create_if_missing: bool) -> Result<(), SettingsError> {
    if dir.as_os_str().is_empty() {
        return Err(SettingsError::EmptyDirectoryPath);
    }

    match fs::symlink_metadata(dir) {
        Ok(meta) => {
            if meta.file_type().is_symlink() {
                return Err(SettingsError::SymlinkRejected(dir.to_path_buf()));
            }
            if !meta.file_type().is_dir() {
                return Err(SettingsError::NotADirectory(dir.to_path_buf()));
            }
            Ok(())
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            if create_if_missing {
                fs::create_dir_all(dir).map_err(|source| SettingsError::Io {
                    path: dir.to_path_buf(),
                    source,
                })?;
                let meta = fs::symlink_metadata(dir).map_err(|source| SettingsError::Io {
                    path: dir.to_path_buf(),
                    source,
                })?;
                if meta.file_type().is_symlink() {
                    return Err(SettingsError::SymlinkRejected(dir.to_path_buf()));
                }
                if !meta.file_type().is_dir() {
                    return Err(SettingsError::NotADirectory(dir.to_path_buf()));
                }
            }
            Ok(())
        }
        Err(source) => Err(SettingsError::Io {
            path: dir.to_path_buf(),
            source,
        }),
    }
}

fn inspect_target_file(target: &Path) -> Result<Option<fs::Metadata>, SettingsError> {
    match fs::symlink_metadata(target) {
        Ok(meta) => {
            if meta.file_type().is_symlink() {
                return Err(SettingsError::SymlinkRejected(target.to_path_buf()));
            }
            if !meta.file_type().is_file() {
                return Err(SettingsError::NonRegularTarget(target.to_path_buf()));
            }
            Ok(Some(meta))
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(source) => Err(SettingsError::Io {
            path: target.to_path_buf(),
            source,
        }),
    }
}

/// Resolves the canonical settings file path inside a caller-provided FerShot directory.
pub fn resolve_settings_file_path(dir: &Path) -> Result<PathBuf, SettingsError> {
    if dir.as_os_str().is_empty() {
        return Err(SettingsError::EmptyDirectoryPath);
    }
    Ok(dir.join(SETTINGS_FILE_NAME))
}

/// Loads `AppSettings` from `dir/fershot-settings.json`, returning `AppSettings::default()` when
/// the directory or file does not yet exist.
pub fn load_settings(dir: &Path) -> Result<AppSettings, SettingsError> {
    validate_directory_no_symlink(dir, false)?;
    let target = resolve_settings_file_path(dir)?;

    let Some(meta) = inspect_target_file(&target)? else {
        return Ok(AppSettings::default());
    };

    if meta.len() > MAX_SETTINGS_BYTES {
        return Err(SettingsError::FileTooLarge {
            size: meta.len(),
            max: MAX_SETTINGS_BYTES,
        });
    }

    let file = File::open(&target).map_err(|source| SettingsError::Io {
        path: target.clone(),
        source,
    })?;

    let mut buffer = Vec::with_capacity((meta.len() as usize).min(MAX_SETTINGS_BYTES as usize));
    file.take(MAX_SETTINGS_BYTES + 1)
        .read_to_end(&mut buffer)
        .map_err(|source| SettingsError::Io {
            path: target.clone(),
            source,
        })?;

    if (buffer.len() as u64) > MAX_SETTINGS_BYTES {
        return Err(SettingsError::FileTooLarge {
            size: buffer.len() as u64,
            max: MAX_SETTINGS_BYTES,
        });
    }

    let raw = std::str::from_utf8(&buffer)
        .map_err(|err| SettingsError::MalformedJson(err.to_string()))?;

    parse_settings_str(raw)
}

/// Validates and atomically writes `AppSettings` to `dir/fershot-settings.json`.
///
/// Any pre-existing valid settings file is preserved untouched if validation or temporary file
/// staging fails.
pub fn save_settings(dir: &Path, settings: &AppSettings) -> Result<PathBuf, SettingsError> {
    let serialized = serialize_settings_string(settings)?;
    validate_directory_no_symlink(dir, true)?;
    let target = resolve_settings_file_path(dir)?;
    let _ = inspect_target_file(&target)?;

    let pid = std::process::id();
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let seq = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
    let temp_name = format!(".{SETTINGS_FILE_NAME}.tmp.{pid}.{nanos}.{seq}");
    let temp_path = dir.join(temp_name);

    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }

    let write_result = (|| -> Result<(), SettingsError> {
        let mut temp_file = options
            .open(&temp_path)
            .map_err(|source| SettingsError::Io {
                path: temp_path.clone(),
                source,
            })?;
        temp_file
            .write_all(serialized.as_bytes())
            .map_err(|source| SettingsError::Io {
                path: temp_path.clone(),
                source,
            })?;
        temp_file.sync_all().map_err(|source| SettingsError::Io {
            path: temp_path.clone(),
            source,
        })?;
        drop(temp_file);

        // Re-check target right before rename to refuse symlink/non-regular replacement
        let _ = inspect_target_file(&target)?;

        fs::rename(&temp_path, &target).map_err(|source| SettingsError::Io {
            path: target.clone(),
            source,
        })?;

        if let Ok(dir_handle) = File::open(dir) {
            let _ = dir_handle.sync_all();
        }
        Ok(())
    })();

    if write_result.is_err() {
        let _ = fs::remove_file(&temp_path);
    }

    write_result?;
    Ok(target)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn returns_default_settings_when_directory_or_file_is_missing() {
        let temp = TempDir::new().expect("tempdir");
        let missing_dir = temp.path().join("nonexistent-fershot-dir");

        let loaded = load_settings(&missing_dir).expect("missing dir should yield defaults");
        assert_eq!(loaded, AppSettings::default());
        assert_eq!(loaded.save_format, SaveFormat::Png);
        assert_eq!(loaded.jpeg_quality, 90);
        assert!(!loaded.downscale_retina);
        assert!(loaded.show_preview);
    }

    #[test]
    fn round_trips_valid_settings_atomically() {
        let temp = TempDir::new().expect("tempdir");
        let custom = AppSettings {
            save_format: SaveFormat::Jpeg,
            jpeg_quality: 75,
            downscale_retina: true,
            show_preview: false,
        };

        let saved_path = save_settings(temp.path(), &custom).expect("save should succeed");
        assert_eq!(saved_path, temp.path().join(SETTINGS_FILE_NAME));

        let loaded = load_settings(temp.path()).expect("load should succeed");
        assert_eq!(loaded, custom);
    }

    #[test]
    fn rejects_invalid_jpeg_quality_and_preserves_existing_file_on_failed_write() {
        let temp = TempDir::new().expect("tempdir");
        let initial = AppSettings {
            save_format: SaveFormat::Png,
            jpeg_quality: 88,
            downscale_retina: true,
            show_preview: true,
        };
        save_settings(temp.path(), &initial).expect("initial save");

        for bad_quality in [0_u8, 101_u8, 255_u8] {
            let invalid = AppSettings {
                jpeg_quality: bad_quality,
                ..initial.clone()
            };
            let err = save_settings(temp.path(), &invalid).expect_err("must reject bad quality");
            assert!(matches!(err, SettingsError::InvalidJpegQuality(q) if q == bad_quality));
        }

        let preserved = load_settings(temp.path()).expect("existing file must remain valid");
        assert_eq!(preserved, initial);
    }

    #[test]
    fn rejects_malformed_truncated_unknown_field_and_unsupported_version_json() {
        let temp = TempDir::new().expect("tempdir");
        let file_path = temp.path().join(SETTINGS_FILE_NAME);

        // Truncated JSON
        fs::write(
            &file_path,
            b"{\"version\": 1, \"settings\": {\"saveFormat\":",
        )
        .unwrap();
        assert!(matches!(
            load_settings(temp.path()),
            Err(SettingsError::MalformedJson(_))
        ));

        // Unknown schema version
        fs::write(
            &file_path,
            br#"{"version": 2, "settings": {"saveFormat": "png", "jpegQuality": 90, "downscaleRetina": false, "showPreview": true}}"#,
        )
        .unwrap();
        assert!(matches!(
            load_settings(temp.path()),
            Err(SettingsError::UnsupportedVersion(2))
        ));

        // Unknown extra field
        fs::write(
            &file_path,
            br#"{"version": 1, "settings": {"saveFormat": "png", "jpegQuality": 90, "downscaleRetina": false, "showPreview": true, "extra": 1}}"#,
        )
        .unwrap();
        assert!(matches!(
            load_settings(temp.path()),
            Err(SettingsError::MalformedJson(_))
        ));
    }

    #[test]
    fn rejects_oversized_settings_file() {
        let temp = TempDir::new().expect("tempdir");
        let file_path = temp.path().join(SETTINGS_FILE_NAME);
        let oversized = vec![b' '; (MAX_SETTINGS_BYTES as usize) + 128];
        fs::write(&file_path, oversized).unwrap();

        let err = load_settings(temp.path()).expect_err("must reject oversized file");
        assert!(matches!(err, SettingsError::FileTooLarge { .. }));
    }

    #[test]
    fn rejects_non_regular_target_and_preserves_existing_directory() {
        let temp = TempDir::new().expect("tempdir");
        let target_as_dir = temp.path().join(SETTINGS_FILE_NAME);
        fs::create_dir(&target_as_dir).unwrap();

        assert!(matches!(
            load_settings(temp.path()),
            Err(SettingsError::NonRegularTarget(_))
        ));
        assert!(matches!(
            save_settings(temp.path(), &AppSettings::default()),
            Err(SettingsError::NonRegularTarget(_))
        ));
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlink_target_and_symlink_directory() {
        use std::os::unix::fs::symlink;

        let temp = TempDir::new().expect("tempdir");
        let outside_file = temp.path().join("outside.json");
        fs::write(&outside_file, b"outside-content").unwrap();

        let crate_dir = temp.path().join("fershot-config");
        fs::create_dir(&crate_dir).unwrap();
        let symlink_target = crate_dir.join(SETTINGS_FILE_NAME);
        symlink(&outside_file, &symlink_target).unwrap();

        // Must refuse both load and save on symlink target and leave outside_file untouched
        assert!(matches!(
            load_settings(&crate_dir),
            Err(SettingsError::SymlinkRejected(_))
        ));
        assert!(matches!(
            save_settings(&crate_dir, &AppSettings::default()),
            Err(SettingsError::SymlinkRejected(_))
        ));
        assert_eq!(fs::read(&outside_file).unwrap(), b"outside-content");

        // Must also refuse a symlinked directory path
        let symlink_dir = temp.path().join("fershot-config-link");
        symlink(&crate_dir, &symlink_dir).unwrap();
        assert!(matches!(
            load_settings(&symlink_dir),
            Err(SettingsError::SymlinkRejected(_))
        ));
    }
}
