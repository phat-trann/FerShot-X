//! Private, bounded local copies of non-uploaded PNG screenshots.
//!
//! The caller supplies the application-owned directory. This crate never scans
//! outside it, follows symlinks, or removes user originals.

use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use std::{fmt, io};
use std::sync::atomic::{AtomicU64, Ordering};

pub const LOCAL_RETENTION_SECONDS: u64 = 30 * 24 * 60 * 60;
pub const MAX_ENTRY_BYTES: usize = 32 * 1024 * 1024;
pub const MAX_DRAFT_BYTES: usize = 32 * 1024 * 1024;
pub const MAX_ENTRY_COUNT: usize = 256;
pub const MAX_TOTAL_BYTES: u64 = 256 * 1024 * 1024;
const META_SUFFIX: &str = ".json";
const PNG_SUFFIX: &str = ".png";
const MAX_METADATA_BYTES: u64 = 16 * 1024;
static TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CacheLimits {
    pub max_entry_bytes: usize,
    pub max_entries: usize,
    pub max_total_bytes: u64,
    pub retention: Duration,
}

impl Default for CacheLimits {
    fn default() -> Self {
        Self {
            max_entry_bytes: MAX_ENTRY_BYTES,
            max_entries: MAX_ENTRY_COUNT,
            max_total_bytes: MAX_TOTAL_BYTES,
            retention: Duration::from_secs(LOCAL_RETENTION_SECONDS),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CacheEntry {
    pub id: String,
    pub name: String,
    pub created_at: u64,
    pub expires_at: u64,
    pub byte_size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CachedImage {
    pub metadata: CacheEntry,
    pub png_bytes: Vec<u8>,
}

#[derive(Debug)]
pub enum CacheError {
    InvalidRoot,
    SymlinkRejected(PathBuf),
    NotDirectory(PathBuf),
    UnsafeId(String),
    InvalidLimits,
    NotFound(String),
    NotPng,
    EntryTooLarge { size: usize, max: usize },
    EntryCountLimit,
    TotalBytesLimit,
    MalformedMetadata(PathBuf),
    Io { path: PathBuf, source: io::Error },
    Clock,
}

impl fmt::Display for CacheError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidRoot => write!(f, "cache root must not be empty"),
            Self::SymlinkRejected(path) => write!(f, "symlink rejected: {}", path.display()),
            Self::NotDirectory(path) => write!(f, "cache root is not a directory: {}", path.display()),
            Self::UnsafeId(id) => write!(f, "unsafe cache id: {id}"),
            Self::InvalidLimits => write!(f, "invalid cache limits"),
            Self::NotFound(id) => write!(f, "cache entry not found: {id}"),
            Self::NotPng => write!(f, "cache payload is not a PNG"),
            Self::EntryTooLarge { size, max } => write!(f, "cache entry is too large: {size} > {max}"),
            Self::EntryCountLimit => write!(f, "cache entry count limit exceeded"),
            Self::TotalBytesLimit => write!(f, "cache disk budget exceeded"),
            Self::MalformedMetadata(path) => write!(f, "malformed cache metadata: {}", path.display()),
            Self::Io { path, source } => write!(f, "cache I/O at {}: {source}", path.display()),
            Self::Clock => write!(f, "system clock is before UNIX epoch"),
        }
    }
}

impl std::error::Error for CacheError {}

fn now() -> Result<u64, CacheError> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .map_err(|_| CacheError::Clock)
}

fn validate_id(id: &str) -> Result<(), CacheError> {
    if id.is_empty()
        || id.len() > 128
        || id.starts_with('.')
        || !id.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
    {
        return Err(CacheError::UnsafeId(id.to_owned()));
    }
    Ok(())
}

fn ensure_root(root: &Path, create: bool) -> Result<(), CacheError> {
    if root.as_os_str().is_empty() {
        return Err(CacheError::InvalidRoot);
    }
    match fs::symlink_metadata(root) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            Err(CacheError::SymlinkRejected(root.to_path_buf()))
        }
        Ok(metadata) if !metadata.is_dir() => Err(CacheError::NotDirectory(root.to_path_buf())),
        Ok(_) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound && create => {
            fs::create_dir_all(root).map_err(|source| CacheError::Io {
                path: root.to_path_buf(),
                source,
            })?;
            set_private_dir(root)?;
            Ok(())
        }
        Err(source) => Err(CacheError::Io {
            path: root.to_path_buf(),
            source,
        }),
    }
}

fn set_private_dir(path: &Path) -> Result<(), CacheError> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700)).map_err(|source| {
            CacheError::Io {
                path: path.to_path_buf(),
                source,
            }
        })?;
    }
    Ok(())
}

fn set_private_file(path: &Path) -> Result<(), CacheError> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|source| {
            CacheError::Io {
                path: path.to_path_buf(),
                source,
            }
        })?;
    }
    Ok(())
}

fn file_path(root: &Path, id: &str, suffix: &str) -> PathBuf {
    root.join(format!("{id}{suffix}"))
}

fn is_png(bytes: &[u8]) -> bool {
    bytes.starts_with(b"\x89PNG\r\n\x1a\n")
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), CacheError> {
    if let Ok(metadata) = fs::symlink_metadata(path) {
        if metadata.file_type().is_symlink() {
            return Err(CacheError::SymlinkRejected(path.to_path_buf()));
        }
    }
    let temp = path.with_file_name(format!(
        ".{}.tmp.{}.{}",
        path.file_name().and_then(|name| name.to_str()).unwrap_or("cache"),
        std::process::id(),
        TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed)
    ));
    let mut created = false;
    let result = (|| {
        let mut options = OpenOptions::new();
        options.create_new(true).write(true);
        #[cfg(unix)] { use std::os::unix::fs::OpenOptionsExt; options.mode(0o600); }
        let mut file = options.open(&temp)
            .map_err(|source| CacheError::Io {
                path: temp.clone(),
                source,
            })?;
        created = true;
        file.write_all(bytes).map_err(|source| CacheError::Io {
            path: temp.clone(),
            source,
        })?;
        file.sync_all().map_err(|source| CacheError::Io {
            path: temp.clone(),
            source,
        })?;
        set_private_file(&temp)?;
        fs::rename(&temp, path).map_err(|source| CacheError::Io {
            path: path.to_path_buf(),
            source,
        })
    })();
    if result.is_err() && created {
        let _ = fs::remove_file(&temp);
    }
    result
}

fn read_bounded(path: &Path, max_bytes: u64) -> Result<Vec<u8>, CacheError> {
    let metadata = fs::symlink_metadata(path).map_err(|source| CacheError::Io {
        path: path.to_path_buf(),
        source,
    })?;
    if metadata.file_type().is_symlink() {
        return Err(CacheError::SymlinkRejected(path.to_path_buf()));
    }
    if !metadata.is_file() {
        return Err(CacheError::NotDirectory(path.to_path_buf()));
    }
    if metadata.len() > max_bytes {
        return Err(CacheError::EntryTooLarge {
            size: metadata.len().min(usize::MAX as u64) as usize,
            max: max_bytes.min(usize::MAX as u64) as usize,
        });
    }
    let mut bytes = Vec::with_capacity(metadata.len() as usize);
    File::open(path)
        .and_then(|file| file.take(max_bytes.saturating_add(1)).read_to_end(&mut bytes))
        .map_err(|source| CacheError::Io {
            path: path.to_path_buf(),
            source,
        })?;
    if bytes.len() as u64 > max_bytes {
        return Err(CacheError::EntryTooLarge {
            size: bytes.len(),
            max: max_bytes.min(usize::MAX as u64) as usize,
        });
    }
    Ok(bytes)
}

pub struct LocalCache {
    root: PathBuf,
    limits: CacheLimits,
}

impl LocalCache {
    pub fn open(root: impl Into<PathBuf>, limits: CacheLimits) -> Result<Self, CacheError> {
        if limits.max_entry_bytes == 0
            || limits.max_entries == 0
            || limits.max_total_bytes == 0
            || limits.max_entry_bytes as u64 > limits.max_total_bytes
            || limits.retention.is_zero()
        {
            return Err(CacheError::InvalidLimits);
        }
        let root = root.into();
        ensure_root(&root, true)?;
        set_private_dir(&root)?;
        Ok(Self { root, limits })
    }

    pub fn store(
        &self,
        id: &str,
        name: &str,
        png_bytes: &[u8],
        created_at: u64,
    ) -> Result<CacheEntry, CacheError> {
        validate_id(id)?;
        if name.is_empty() || name.len() > 480 || name.chars().any(char::is_control) {
            return Err(CacheError::MalformedMetadata(file_path(&self.root, id, META_SUFFIX)));
        }
        for suffix in [PNG_SUFFIX, META_SUFFIX] {
            let path = file_path(&self.root, id, suffix);
            if let Ok(metadata) = fs::symlink_metadata(&path) {
                if metadata.file_type().is_symlink() { return Err(CacheError::SymlinkRejected(path)); }
                if !metadata.is_file() { return Err(CacheError::NotDirectory(path)); }
            }
        }
        if !is_png(png_bytes) {
            return Err(CacheError::NotPng);
        }
        if png_bytes.len() > self.limits.max_entry_bytes {
            return Err(CacheError::EntryTooLarge {
                size: png_bytes.len(),
                max: self.limits.max_entry_bytes,
            });
        }
        let entries = self.list()?;
        let existing_size = entries.iter().find(|entry| entry.id == id).map_or(0, |entry| entry.byte_size);
        if entries.len() - usize::from(existing_size > 0) >= self.limits.max_entries {
            return Err(CacheError::EntryCountLimit);
        }
        let total = self.storage_bytes(&entries)?;
        let new_total = total.saturating_sub(existing_size).saturating_add(png_bytes.len() as u64);
        if new_total > self.limits.max_total_bytes {
            return Err(CacheError::TotalBytesLimit);
        }
        let expires_at = created_at.saturating_add(self.limits.retention.as_secs());
        let metadata = CacheEntry {
            id: id.to_owned(),
            name: name.to_owned(),
            created_at,
            expires_at,
            byte_size: png_bytes.len() as u64,
        };
        let metadata_bytes = serde_json::to_vec(&metadata).map_err(|source| CacheError::Io {
            path: file_path(&self.root, id, META_SUFFIX),
            source: io::Error::new(io::ErrorKind::InvalidData, source),
        })?;
        atomic_write(&file_path(&self.root, id, PNG_SUFFIX), png_bytes)?;
        atomic_write(&file_path(&self.root, id, META_SUFFIX), &metadata_bytes)?;
        Ok(metadata)
    }

    pub fn list(&self) -> Result<Vec<CacheEntry>, CacheError> {
        ensure_root(&self.root, false)?;
        let mut result = Vec::new();
        let mut image_bytes = 0u64;
        for item in fs::read_dir(&self.root).map_err(|source| CacheError::Io {
            path: self.root.clone(),
            source,
        })? {
            let path = item
                .map_err(|source| CacheError::Io {
                    path: self.root.clone(),
                    source,
                })?
                .path();
            let metadata = fs::symlink_metadata(&path).map_err(|source| CacheError::Io {
                path: path.clone(),
                source,
            })?;
            if matches!(path.extension().and_then(|value| value.to_str()),Some("png"|"draft")) {
                if metadata.file_type().is_symlink() { return Err(CacheError::SymlinkRejected(path)); }
                if !metadata.is_file() { return Err(CacheError::NotDirectory(path)); }
                image_bytes = image_bytes.saturating_add(metadata.len());
                if image_bytes > self.limits.max_total_bytes { return Err(CacheError::TotalBytesLimit); }
                continue;
            }
            if path.extension().and_then(|value| value.to_str()) != Some("json") { continue; }
            if metadata.file_type().is_symlink() { return Err(CacheError::SymlinkRejected(path)); }
            if !metadata.is_file() { return Err(CacheError::NotDirectory(path)); }
            if result.len() >= self.limits.max_entries { return Err(CacheError::EntryCountLimit); }
            let bytes = read_bounded(&path, MAX_METADATA_BYTES)?;
            let entry: CacheEntry = serde_json::from_slice(&bytes)
                .map_err(|_| CacheError::MalformedMetadata(path.clone()))?;
            validate_id(&entry.id)?;
            if path.file_stem().and_then(|value| value.to_str()) != Some(entry.id.as_str()) {
                return Err(CacheError::MalformedMetadata(path));
            }
            if entry.name.is_empty() || entry.name.len() > 480 || entry.name.chars().any(char::is_control)
                || entry.expires_at != entry.created_at.saturating_add(self.limits.retention.as_secs()) {
                return Err(CacheError::MalformedMetadata(path));
            }
            let image = file_path(&self.root, &entry.id, PNG_SUFFIX);
            let image_metadata = fs::symlink_metadata(&image).map_err(|source| CacheError::Io { path: image.clone(), source })?;
            if image_metadata.file_type().is_symlink() { return Err(CacheError::SymlinkRejected(image)); }
            if !image_metadata.is_file() { return Err(CacheError::NotDirectory(image)); }
            if image_metadata.len() > self.limits.max_entry_bytes as u64 {
                return Err(CacheError::EntryTooLarge { size: image_metadata.len().min(usize::MAX as u64) as usize, max: self.limits.max_entry_bytes });
            }
            if image_metadata.len() != entry.byte_size { return Err(CacheError::MalformedMetadata(path)); }
            result.push(entry);
        }
        result.sort_by_key(|entry| entry.created_at);
        Ok(result)
    }

    pub fn read(&self, id: &str) -> Result<CachedImage, CacheError> {
        validate_id(id)?;
        let metadata = self
            .list()?
            .into_iter()
            .find(|entry| entry.id == id)
            .ok_or_else(|| CacheError::NotFound(id.to_owned()))?;
        let path = file_path(&self.root, id, PNG_SUFFIX);
        let file_metadata = fs::symlink_metadata(&path).map_err(|source| CacheError::Io {
            path: path.clone(),
            source,
        })?;
        if file_metadata.file_type().is_symlink() || !file_metadata.is_file() {
            return Err(CacheError::SymlinkRejected(path));
        }
        let png_bytes = read_bounded(&path, self.limits.max_entry_bytes as u64)?;
        if png_bytes.len() as u64 != metadata.byte_size || !is_png(&png_bytes) {
            return Err(CacheError::NotPng);
        }
        Ok(CachedImage { metadata, png_bytes })
    }

    pub fn remove(&self, id: &str) -> Result<bool, CacheError> {
        validate_id(id)?;
        let metadata_path = file_path(&self.root, id, META_SUFFIX);
        let png_path = file_path(&self.root, id, PNG_SUFFIX);
        let existed = metadata_path.exists() || png_path.exists();
        if !existed {
            return Ok(false);
        }
        for path in [metadata_path, png_path, file_path(&self.root,id,".draft")] {
            match fs::symlink_metadata(&path) {
                Ok(metadata) if metadata.file_type().is_symlink() => return Err(CacheError::SymlinkRejected(path)),
                Ok(metadata) if metadata.is_file() => fs::remove_file(&path).map_err(|source| CacheError::Io { path: path.clone(), source })?,
                Ok(_) => return Err(CacheError::NotDirectory(path)),
                Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                Err(source) => return Err(CacheError::Io { path, source }),
            }
        }
        Ok(true)
    }

    pub fn prune(&self, now_seconds: u64) -> Result<Vec<String>, CacheError> {
        let expired: Vec<String> = self
            .list()?
            .into_iter()
            .filter(|entry| entry.expires_at <= now_seconds)
            .map(|entry| entry.id)
            .collect();
        for id in &expired {
            self.remove(id)?;
        }
        Ok(expired)
    }

    pub fn prune_expired(&self) -> Result<Vec<String>, CacheError> {
        self.prune(now()?)
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    fn draft_size(&self,id:&str)->Result<u64,CacheError>{
        let path=file_path(&self.root,id,".draft");
        match fs::symlink_metadata(&path){Ok(meta)=>{if meta.file_type().is_symlink(){return Err(CacheError::SymlinkRejected(path))}if !meta.is_file(){return Err(CacheError::NotDirectory(path))}Ok(meta.len())},Err(e)if e.kind()==io::ErrorKind::NotFound=>Ok(0),Err(source)=>Err(CacheError::Io{path,source})}
    }
    fn storage_bytes(&self,entries:&[CacheEntry])->Result<u64,CacheError>{entries.iter().try_fold(0u64,|sum,entry|Ok(sum.saturating_add(entry.byte_size).saturating_add(self.draft_size(&entry.id)?)))}
    /// Bounded, private companion document; never scans or removes user files.
    pub fn write_draft(&self,id:&str,bytes:&[u8])->Result<(),CacheError>{
        validate_id(id)?;
        if bytes.len()>MAX_DRAFT_BYTES{return Err(CacheError::EntryTooLarge{size:bytes.len(),max:MAX_DRAFT_BYTES})}
        self.read(id)?;
        let total=self.storage_bytes(&self.list()?)?.saturating_sub(self.draft_size(id)?).saturating_add(bytes.len()as u64);
        if total>self.limits.max_total_bytes{return Err(CacheError::TotalBytesLimit)}
        atomic_write(&file_path(&self.root,id,".draft"),bytes)
    }
    pub fn read_draft(&self,id:&str)->Result<Option<Vec<u8>>,CacheError>{
        validate_id(id)?;let path=file_path(&self.root,id,".draft");
        match fs::symlink_metadata(&path){Ok(_)=>read_bounded(&path,MAX_DRAFT_BYTES as u64).map(Some),Err(e)if e.kind()==io::ErrorKind::NotFound=>Ok(None),Err(source)=>Err(CacheError::Io{path,source})}
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn png() -> Vec<u8> {
        b"\x89PNG\r\n\x1a\nsynthetic".to_vec()
    }

    #[test]
    fn stores_reads_lists_and_removes_private_png_copies() {
        let dir = tempdir().unwrap();
        let cache = LocalCache::open(dir.path(), CacheLimits::default()).unwrap();
        let entry = cache.store("capture-1", "capture.png", &png(), 100).unwrap();
        assert_eq!(entry.expires_at, 100 + LOCAL_RETENTION_SECONDS);
        assert_eq!(cache.list().unwrap().len(), 1);
        assert_eq!(cache.read("capture-1").unwrap().png_bytes, png());
        assert!(cache.remove("capture-1").unwrap());
        assert!(cache.list().unwrap().is_empty());
    }

    #[test]
    fn enforces_png_bounds_count_disk_and_expiration() {
        let dir = tempdir().unwrap();
        let limits = CacheLimits { max_entry_bytes: 20, max_entries: 1, max_total_bytes: 20, retention: Duration::from_secs(10) };
        let cache = LocalCache::open(dir.path(), limits).unwrap();
        cache.store("one", "one.png", &png(), 100).unwrap();
        assert!(matches!(cache.store("two", "two.png", &png(), 100), Err(CacheError::EntryCountLimit)));
        assert_eq!(cache.prune(110).unwrap(), vec!["one"]);
        assert!(matches!(cache.store("bad", "bad.png", b"not-png", 100), Err(CacheError::NotPng)));
    }

    #[test]
    fn draft_is_private_bounded_and_removed_with_the_single_image(){
        let dir=tempdir().unwrap();let cache=LocalCache::open(dir.path(),CacheLimits::default()).unwrap();
        cache.store("one","One.png",&png(),100).unwrap();cache.write_draft("one",br#"{"schemaVersion":1,"advanced":[]}"#).unwrap();
        let original=cache.read_draft("one").unwrap().unwrap();assert!(cache.write_draft("one",&vec![0;MAX_DRAFT_BYTES+1]).is_err());assert_eq!(cache.read_draft("one").unwrap().unwrap(),original);
        assert_eq!(cache.list().unwrap().len(),1);cache.prune(100+LOCAL_RETENTION_SECONDS).unwrap();assert!(cache.read_draft("one").unwrap().is_none());
    }

    #[test]
    fn rejects_unsafe_ids_and_symlinked_roots() {
        let dir = tempdir().unwrap();
        let cache = LocalCache::open(dir.path(), CacheLimits::default()).unwrap();
        assert!(matches!(cache.store("../bad", "bad.png", &png(), 0), Err(CacheError::UnsafeId(_))));
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            let link = dir.path().join("link");
            symlink(dir.path(), &link).unwrap();
            assert!(matches!(LocalCache::open(link, CacheLimits::default()), Err(CacheError::SymlinkRejected(_))));
        }
    }
    #[test]
    fn draft_bytes_share_the_cache_budget_and_failed_growth_preserves_draft(){
        let tmp=tempdir().unwrap();let limits=CacheLimits{max_entry_bytes:64,max_entries:4,max_total_bytes:64,retention:Duration::from_secs(60)};
        let cache=LocalCache::open(tmp.path().join("cache"),limits).unwrap();cache.store("one","One.png",&png(),100).unwrap();cache.write_draft("one",b"small").unwrap();
        assert!(matches!(cache.write_draft("one",&vec![0;64]),Err(CacheError::TotalBytesLimit)));
        assert_eq!(cache.read_draft("one").unwrap().unwrap(),b"small");
    }
}
