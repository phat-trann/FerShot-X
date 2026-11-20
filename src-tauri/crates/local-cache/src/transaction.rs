//! Undo journal for the flat Local cache. `LocalCache` holds the root file lock.
use super::*;

const SUFFIXES: [&str; 3] = [PNG_SUFFIX, META_SUFFIX, ".draft"];

pub(super) enum Change<'a> {
    Keep,
    Write(&'a [u8]),
    Remove,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Journal {
    changes: [u8; 3],
    previous: [bool; 3],
}

fn io_error(path: &Path, source: io::Error) -> CacheError {
    CacheError::Io { path: path.into(), source }
}

fn sync_dir(path: &Path) -> Result<(), CacheError> {
    File::open(path).and_then(|file| file.sync_all()).map_err(|error| io_error(path, error))
}

fn journal_path(root: &Path, id: &str) -> PathBuf {
    root.join(format!(".txn-{id}"))
}

fn unique_path(root: &Path, prefix: &str) -> PathBuf {
    root.join(format!("{prefix}-{}-{}", std::process::id(), TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed)))
}

fn install(source: &Path, target: &Path) -> Result<(), CacheError> {
    let metadata = fs::symlink_metadata(source).map_err(|error| io_error(source, error))?;
    if !metadata.is_file() {
        return Err(CacheError::SymlinkRejected(source.into()));
    }
    let parent = target.parent().ok_or(CacheError::InvalidRoot)?;
    let temp = unique_path(parent, ".restore");
    fs::hard_link(source, &temp).map_err(|error| io_error(source, error))?;
    let result = fs::rename(&temp, target).map_err(|error| io_error(target, error));
    // POSIX rename can leave the source link in place when both names share an inode.
    let _ = fs::remove_file(temp);
    result
}

fn erase(path: &Path) -> Result<(), CacheError> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.is_file() => fs::remove_file(path).map_err(|error| io_error(path, error)),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(io_error(path, error)),
        _ => Err(CacheError::SymlinkRejected(path.into())),
    }
}

fn finish(root: &Path, id: &str) -> Result<(), CacheError> {
    let dir = journal_path(root, id);
    let metadata = fs::symlink_metadata(&dir).map_err(|error| io_error(&dir, error))?;
    if !metadata.is_dir() {
        return Err(CacheError::SymlinkRejected(dir));
    }
    let prepared = dir.join("prepared");
    if prepared.exists() && !dir.join("committed").exists() {
        let journal: Journal = serde_json::from_slice(&read_bounded(&prepared, 1024)?)
            .map_err(|_| CacheError::MalformedMetadata(prepared))?;
        if journal.changes.iter().any(|action| *action > 2) {
            return Err(CacheError::MalformedMetadata(dir));
        }
        for (index, suffix) in SUFFIXES.iter().enumerate() {
            if journal.changes[index] == 0 { continue; }
            let target = file_path(root, id, suffix);
            if journal.previous[index] {
                install(&dir.join(format!("old-{index}")), &target)?;
            } else {
                erase(&target)?;
            }
        }
        sync_dir(root)?;
    }
    // Retire the directory atomically before deleting its commit marker or backups.
    let retired = unique_path(root, ".retired-txn");
    fs::rename(&dir, &retired).map_err(|error| io_error(&dir, error))?;
    sync_dir(root)?;
    let _ = fs::remove_dir_all(retired);
    Ok(())
}

pub(super) fn recover(root: &Path) {
    let Ok(entries) = fs::read_dir(root) else { return };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let Some(name) = name.to_str() else { continue };
        if name.starts_with(".retired-txn-") && entry.file_type().is_ok_and(|kind| kind.is_dir()) {
            let _ = fs::remove_dir_all(entry.path());
        } else if name.starts_with(".restore-") && entry.file_type().is_ok_and(|kind|kind.is_file()) {
            let _ = fs::remove_file(entry.path());
        } else if let Some(id) = name.strip_prefix(".txn-") {
            if validate_id(id).is_ok() {
                let _ = finish(root, id);
            }
        }
    }
}

pub(super) fn pending(root: &Path, id: &str) -> bool {
    journal_path(root, id).exists()
}

fn prepare(root: &Path, id: &str, changes: &[Change<'_>; 3]) -> Result<Journal, CacheError> {
    let dir = journal_path(root, id);
    fs::create_dir(&dir).map_err(|error| io_error(&dir, error))?;
    set_private_dir(&dir)?;
    let mut journal = Journal { changes: [0; 3], previous: [false; 3] };
    for (index, change) in changes.iter().enumerate() {
        journal.changes[index] = match change {
            Change::Keep => continue,
            Change::Write(_) => 1,
            Change::Remove => 2,
        };
        let old = file_path(root, id, SUFFIXES[index]);
        match fs::symlink_metadata(&old) {
            Ok(metadata) if metadata.is_file() => {
                fs::hard_link(&old, dir.join(format!("old-{index}"))).map_err(|error| io_error(&old, error))?;
                journal.previous[index] = true;
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => {},
            Err(error) => return Err(io_error(&old, error)),
            _ => return Err(CacheError::SymlinkRejected(old)),
        }
        if let Change::Write(bytes) = change {
            atomic_write(&dir.join(format!("new-{index}")), bytes)?;
        }
    }
    sync_dir(&dir)?;
    let bytes = serde_json::to_vec(&journal).map_err(|_| CacheError::MalformedMetadata(dir.clone()))?;
    atomic_write(&dir.join("prepared"), &bytes)?;
    sync_dir(&dir)?;
    sync_dir(root)?;
    Ok(journal)
}

pub(super) fn commit(root: &Path, id: &str, changes: [Change<'_>; 3]) -> Result<(), CacheError> {
    validate_id(id)?;
    if pending(root, id) {
        finish(root, id)?;
    }
    let dir = journal_path(root, id);
    let result = (|| {
        prepare(root, id, &changes)?;
        for (index, change) in changes.iter().enumerate() {
            let target = file_path(root, id, SUFFIXES[index]);
            match change {
                Change::Write(_) => install(&dir.join(format!("new-{index}")), &target)?,
                Change::Remove => erase(&target)?,
                Change::Keep => {},
            }
        }
        sync_dir(root)?;
        atomic_write(&dir.join("committed"), b"1")?;
        sync_dir(&dir)
    })();
    if result.is_err() && dir.join("committed").exists() {
        // If the commit marker could not be synced, make rollback durable first.
        erase(&dir.join("committed"))?;
        sync_dir(&dir)?;
    }
    // A completed journal can be retired on next open if cleanup is interrupted.
    let _ = finish(root, id);
    result
}

#[cfg(test)]mod tests{
 use super::*;
 #[test]fn interrupted_replacement_restores_every_previous_file(){for after in 0..=3{let root=tempfile::tempdir().unwrap();for suffix in SUFFIXES{fs::write(file_path(root.path(),"image",suffix),b"old").unwrap();}let changes=[Change::Write(b"pixels"),Change::Write(b"metadata"),Change::Write(b"draft")];prepare(root.path(),"image",&changes).unwrap();for index in 0..after{install(&journal_path(root.path(),"image").join(format!("new-{index}")),&file_path(root.path(),"image",SUFFIXES[index])).unwrap();}recover(root.path());for suffix in SUFFIXES{assert_eq!(fs::read(file_path(root.path(),"image",suffix)).unwrap(),b"old");}assert!(!pending(root.path(),"image"));}}
 #[test]fn interrupted_new_entry_is_removed_and_committed_entry_survives(){let root=tempfile::tempdir().unwrap();let changes=[Change::Write(b"pixels"),Change::Write(b"metadata"),Change::Write(b"draft")];prepare(root.path(),"new",&changes).unwrap();install(&journal_path(root.path(),"new").join("new-0"),&file_path(root.path(),"new",PNG_SUFFIX)).unwrap();recover(root.path());assert!(!file_path(root.path(),"new",PNG_SUFFIX).exists());commit(root.path(),"new",changes).unwrap();recover(root.path());assert_eq!(fs::read(file_path(root.path(),"new",".draft")).unwrap(),b"draft");}
 #[test]
 fn interrupted_retired_journal_cleanup_cannot_roll_back_the_commit(){
    let root=tempfile::tempdir().unwrap();let path=file_path(root.path(),"image",PNG_SUFFIX);
    fs::write(&path,b"previous").unwrap();
    prepare(root.path(),"image",&[Change::Write(b"committed"),Change::Keep,Change::Keep]).unwrap();
    let active=journal_path(root.path(),"image");install(&active.join("new-0"),&path).unwrap();
    atomic_write(&active.join("committed"),b"1").unwrap();
    let retired=unique_path(root.path(),".retired-txn");fs::rename(&active,&retired).unwrap();
    fs::remove_file(retired.join("committed")).unwrap();
    recover(root.path());assert_eq!(fs::read(path).unwrap(),b"committed");assert!(!retired.exists());
 }
 #[test]fn draft_only_transaction_does_not_rewrite_pixels(){let root=tempfile::tempdir().unwrap();let image=file_path(root.path(),"image",PNG_SUFFIX);fs::write(&image,b"pixels").unwrap();let before=fs::metadata(&image).unwrap().modified().unwrap();commit(root.path(),"image",[Change::Keep,Change::Write(b"metadata"),Change::Write(b"draft")]).unwrap();assert_eq!(fs::metadata(image).unwrap().modified().unwrap(),before);}
}
