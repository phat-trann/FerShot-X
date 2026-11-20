# C181 — source review of current FerShot X

Reviewed the current working tree at base `b3fdbdd`, including uncommitted C180 changes. Findings were derived from source and fresh synthetic reproductions, not historical approval packets. This is a defect report, not an independent approval of Codex-authored code. No production files were changed. MVP acceptance ledger remains unchanged; discovered regressions require separate product acceptance.

## Findings

### R01 / P1 — Local media, metadata and draft are not one transaction

`src-tauri/crates/local-cache/src/lib.rs:322` writes PNG before metadata; `src-tauri/src/local_cache.rs:160` replaces pixels before writing the draft envelope. Failure/crash between commits can leave mismatched metadata/checksum. `LocalCache::list` fails the entire collection on one bad entry; native `open` prunes by listing first. Healthy rows then become unreadable too. A generated temporary cache reproduced listing/read/prune failure after simulating interruption between the two renames. Use versioned generations plus a single committed pointer or a transactional manifest; isolate/quarantine one damaged entry.

### R02 / P1 — Retry upload races remote deletion

`src-tauri/src/ftp.rs:256` checks the deleting set before acquiring the queue mutex. `ftp_delete_remote:484` can mark that same pending/failed item deleting after this check and before ftp_start acquires the mutex. Start then persists uploading and performs STOR while DELE runs. The server object can reappear and the worker's queue row can disappear. Recheck/transition both states under one lock in a consistent order. Static interleaving analysis; no live FTP performed.

### R03 / P2 — Listing recordings can delete an active document

`src-tauri/src/recording/storage.rs:21` performs destructive age/count/5-GiB pruning inside list. `recording_list` (`mod.rs:38`) neither takes the documents lock nor pins the video currently open/exporting. A Library refresh can delete an original used by playback, export or save; an autosave can race pruning and recreate metadata without media. Move GC out of reads, serialize it and pin active documents. Static lifecycle analysis.

### R04 / P1 — Panic recovery is ineffective in the shipping profile

`src-tauri/src/recording/mod.rs:67` uses catch_unwind and a drop lease to recover a worker, but `src-tauri/Cargo.toml:69` selects panic=abort for release. A Rust panic terminates the process and does not run this recovery. The unwind regression runs under the test profile and cannot establish release recovery. Choose the intended release panic policy explicitly and validate it; Rust unwind is also not a SIGSEGV catcher. Static configuration contradiction, including newly added code.

### R05 / P2 — Awaited Local persistence reports success after failure

`src/Workspace.local-cache.ts:18` catches and consumes write rejection. `Workspace.tsx:342` awaits remember and then hides Edit regardless. Disk-full/cache errors can leave an old or absent draft while Copy/Save appears finished and the error is now in a hidden view. Fresh hook reproduction confirmed remember resolves while saveLocalDraft rejects. Return explicit persistence status or propagate rejection at durable-action boundaries.

### R06 / P2 — Closing Edit retains every image and all histories

`Workspace.tsx:148` appends every open/derived image. `closeDocument:458` only clears selection/video state; URL revocation is deferred until Workspace unmount (`:432`), but native close only hides the retained window. Reopening one image repeatedly grows arrays/maps and hits the hard 512-item rejection (`:143`); large pixel/draft objects accumulate without a byte budget. Release closed document resources and bound any retained source/undo cache.

### R07 / P2 — One broken storage source blanks the other Library tab

`LibraryWindow.tsx:73` publishes Local, FTP and recording reads only through one Promise.all. On cold start, invalid Local data prevents healthy FTP rows from being shown, and FTP queue failure prevents Local from loading. Injected browser reproduction confirmed an independently valid FTP list is hidden by Local failure. Maintain per-source loading/results/errors.

### R08 / P2 — Local preview does not invalidate after draft updates

`LibraryWindow.tsx:89` keys the preview effect by selection/id but has no Local draft/content revision. Successful collection refresh preserves the same selected id, so the selected preview and cached thumbnail can remain stale after Edit saves changes. The thumbnail key/memo (`:34-39`) similarly ignores draft revision. Injected browser reproduction confirmed a Local update event rereads the collection without rereading the selected image. Use content revisions in preview and thumbnail keys.

### R09 / P2 — Unrelated refresh resets Local video playback

Every successful Library refresh increments videoRevision (`LibraryWindow.tsx:73`); it is both a preview-fetch dependency (`:89`) and the VideoPreview React key (`:133`). Upload events, an autosave event or the one-minute poll recreate the same video player and reset its playback/camera state even when that video did not change. Revision should belong to the document, not the collection refresh. Static effect/key analysis.

### R10 / P2 — Locked video annotation can be deleted

Timeline functions enforce locking, but `VideoWorkspace.tsx:56` removes annotations/layers unconditionally and the Edit toolbar Delete button (`:111`) only checks busy/selected. An injected browser case selected a locked Highlight layer, clicked the enabled Delete action and observed it removed from the saved draft. Put lock checks inside shared edit commands; UI disable alone is insufficient.

### R11 / P2 — Video upload is incorrectly dependent on clipboard success

`VideoWorkspace.tsx:79` enqueues, then awaits copyText before starting FTP. Clipboard failure prevents transfer even though the job/URL are valid; image upload handles this as a separate nonfatal step (`Workspace.tsx:363`). Decouple clipboard and transfer as the image path already does. Static output-path analysis.

### R12 / P2 — Imported crash is attributed to the current build/time

`diagnostics.rs:198` imports an old macOS report by calling append with now(); append (`:71`) stamps the currently running package/build instead of preserving crash origin metadata. After updating, an old crash can look like a new-build crash. The panic hook also discards location and technical() silently drops records on lock contention (`:186-190`), limiting diagnosis. Preserve sanitized crash timestamp/version/build and safe panic location, and make dropped diagnostics observable without recursively logging.

## Implementation concerns

- Large orchestration components combine source ownership, autosave, output, window presentation and event dispatch. Separate document/session lifecycle and storage/output controllers; shared commands should enforce rules such as locking and recording exclusion.
- Native booleans/mutexes and renderer refs/string phases model the same operation separately. Define authoritative native transitions and document generations; coordinate asynchronous commands using explicit snapshots and acknowledgements.
- Fixed delays, timer retries and optimistic swallowed errors make successful completion ambiguous. Resource lifetimes, transaction commit and cancellation acknowledgement should define completion instead.
- Passing unit totals do not establish release-profile recovery, concurrency safety, disk-failure behavior or native gesture lifecycle correctness.

## Fresh verification

Ignored reproduction artifacts: `artifacts/reviewer-c181/`.

1. Rust temporary-cache harness: confirmed an interrupted media/metadata replacement blocks healthy-row reads, listing and prune.
2. Vitest hook harness: confirmed a failed save resolves remember(); the configured run also executed the existing unit suite (443 tests including this reproduction passed). Assertions demonstrate the defect, not corrected behavior.
3. Three injected browser reproductions passed: source-failure coupling, stale Local preview invalidation, deletion of a locked video annotation.

No app bundle, live capture/OCR/audio/clipboard/FTP/server/permission actions, signing/Keychain changes, version change, commit or push. Remaining findings are source-level analyses with explicit failure conditions, not claims of observed native reproduction.
