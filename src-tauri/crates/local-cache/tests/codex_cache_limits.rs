use fershot_local_cache::{CacheError, CacheLimits, LocalCache};
use std::{fs, time::Duration};
use tempfile::tempdir;
fn png() -> Vec<u8> { b"\x89PNG\r\n\x1a\nfixture".to_vec() }
fn limits() -> CacheLimits { CacheLimits { max_entry_bytes: 64, max_entries: 2, max_total_bytes: 128, retention: Duration::from_secs(10) } }
#[test]
fn oversized_actual_image_and_metadata_disagreement_are_rejected_before_read() {
    let dir = tempdir().unwrap(); let cache = LocalCache::open(dir.path(), limits()).unwrap();
    cache.store("one", "one.png", &png(), 10).unwrap();
    fs::write(dir.path().join("one.png"), vec![0; 65]).unwrap();
    assert!(matches!(cache.read("one"), Err(CacheError::EntryTooLarge { .. })));
    fs::write(dir.path().join("one.png"), b"short").unwrap();
    assert!(matches!(cache.list(), Err(CacheError::MalformedMetadata(_))));
}
#[test]
fn a_preexisting_cache_cannot_bypass_tighter_count_or_disk_limits() {
    let dir = tempdir().unwrap(); let cache = LocalCache::open(dir.path(), limits()).unwrap();
    cache.store("one", "one.png", &png(), 10).unwrap(); cache.store("two", "two.png", &png(), 10).unwrap();
    let strict = LocalCache::open(dir.path(), CacheLimits { max_entries: 1, ..limits() }).unwrap();
    assert!(matches!(strict.list(), Err(CacheError::EntryCountLimit)));
    fs::write(dir.path().join("orphan.png"), vec![0; 129]).unwrap();
    assert!(matches!(cache.list(), Err(CacheError::TotalBytesLimit)));
}
#[test]
fn forged_expiry_and_names_do_not_extend_retention() {
    let dir = tempdir().unwrap(); let cache = LocalCache::open(dir.path(), limits()).unwrap();
    cache.store("one", "one.png", &png(), 10).unwrap();
    let path = dir.path().join("one.json"); let mut data: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
    data["expires_at"] = 999999.into(); fs::write(&path, serde_json::to_vec(&data).unwrap()).unwrap();
    assert!(matches!(cache.list(), Err(CacheError::MalformedMetadata(_))));
    assert!(cache.store("two", "bad\nname", &png(), 10).is_err());
}
#[cfg(unix)]
#[test]
fn committed_files_are_private_and_metadata_symlinks_cannot_damage_an_image() {
    use std::os::unix::{fs::PermissionsExt, fs::symlink};
    let dir = tempdir().unwrap(); let cache = LocalCache::open(dir.path(), limits()).unwrap();
    cache.store("one", "one.png", &png(), 10).unwrap();
    assert_eq!(fs::metadata(dir.path().join("one.png")).unwrap().permissions().mode() & 0o777, 0o600);
    let before = fs::read(dir.path().join("one.png")).unwrap();
    fs::remove_file(dir.path().join("one.json")).unwrap(); symlink("/tmp", dir.path().join("one.json")).unwrap();
    assert!(matches!(cache.store("one", "one.png", &png(), 10), Err(CacheError::SymlinkRejected(_))));
    assert_eq!(fs::read(dir.path().join("one.png")).unwrap(), before);
}
