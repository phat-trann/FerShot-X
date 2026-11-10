use fershot_local_cache::{CacheError, CacheLimits, LocalCache, LOCAL_RETENTION_SECONDS};
use std::fs;
use std::time::Duration;
use tempfile::tempdir;

fn png() -> Vec<u8> {
    b"\x89PNG\r\n\x1a\nphase2".to_vec()
}

#[test]
fn cache_round_trip_preserves_metadata_and_expiry() {
    let dir = tempdir().unwrap();
    let cache = LocalCache::open(dir.path(), CacheLimits::default()).unwrap();
    let entry = cache.store("captured-1", "capture.png", &png(), 10).unwrap();
    assert_eq!(entry.expires_at, 10 + LOCAL_RETENTION_SECONDS);
    assert_eq!(cache.read("captured-1").unwrap().metadata.name, "capture.png");
}

#[test]
fn cache_prune_is_bounded_and_never_accepts_non_png() {
    let dir = tempdir().unwrap();
    let cache = LocalCache::open(
        dir.path(),
        CacheLimits {
            max_entry_bytes: 64,
            max_entries: 2,
            max_total_bytes: 128,
            retention: Duration::from_secs(10),
        },
    )
    .unwrap();
    cache.store("old", "old.png", &png(), 10).unwrap();
    cache.store("new", "new.png", &png(), 20).unwrap();
    assert_eq!(cache.prune(20).unwrap(), vec!["old"]);
    assert!(matches!(
        cache.store("bad", "bad.png", b"not-png", 20),
        Err(CacheError::NotPng)
    ));
}

#[test]
fn cache_rejects_oversized_metadata_and_symlink_destinations() {
    let dir = tempdir().unwrap();
    let cache = LocalCache::open(dir.path(), CacheLimits::default()).unwrap();
    fs::write(
        dir.path().join("captured.json"),
        vec![b' '; 16 * 1024 + 1],
    )
    .unwrap();
    assert!(matches!(cache.list(), Err(CacheError::EntryTooLarge { .. })));
    fs::remove_file(dir.path().join("captured.json")).unwrap();

    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;
        let link = dir.path().join("linked.png");
        symlink("/tmp", &link).unwrap();
        assert!(matches!(
            cache.store("linked", "linked.png", &png(), 0),
            Err(CacheError::SymlinkRejected(_))
        ));
    }
}

#[test]
fn foreign_temp_file_survives_failed_atomic_write() {
    let dir = tempdir().unwrap();
    let cache = LocalCache::open(dir.path(), CacheLimits::default()).unwrap();
    let legacy_temp = dir.path().join("captured.tmp");
    fs::write(&legacy_temp, b"foreign").unwrap();
    cache.store("captured", "captured.png", &png(), 0).unwrap();
    assert_eq!(fs::read(legacy_temp).unwrap(), b"foreign");
}
