# A210 — Harden FTP Library Action Semantics & Transport Status Wording

## Summary
- **Accurate Transport & Target URL Wording (`src/features/library/LibraryPanel.tsx`)**:
  - Replaced unverified HTTP-liveness labels (`"Uploaded (live URL)"`, `"Upload failed (URL not live)"`) with explicit FTP transport status wording (`"FTP transfer completed (public URL not probed)"`, `"FTP transfer failed (target URL unconfirmed)"`, `"FTP transfer in progress (pending URL)"`, `"Queued for FTP transfer (pending URL)"`).
  - Kept predicted/target URL labels explicit (`Pending URL: ...`, `Target URL (FTP transfer failed): ...`, `Target URL (FTP transfer complete): ...`).
- **Keyboard Shortcut & Busy/Disabled Guards**:
  - Guarded tab, Local item, and FTP item keyboard handlers with `hasCommandModifier` (`metaKey || ctrlKey || altKey`) so modified shortcuts (`Cmd`/`Ctrl`/`Alt` + `R`, `C`, `Delete`, `Backspace`, arrows) never accidentally trigger queue retry, URL copy, or history/item deletion.
  - Guarded keyboard `R` (retry only on `pending` or `failed`), `C` (copy URL), and `Delete`/`Backspace` against `busy || disabled`.
- **Asynchronous Removal Failure Recoverability**:
  - Deferred advancing `selectedUploadId` until the removed item actually leaves `filteredUploads` (recording the preferred neighbor in `pendingRemovalFallbackRef`), so if an asynchronous removal fails and the item remains in `ftpItems`, `Selected upload details` stays focused on that item and displays any updated error alert while preserving zero-latency fallback advancement for synchronous removals.

## Verification
- `npx vitest run src/features/library/LibraryPanel.test.tsx src/testing/antigravity-library-queue.test.tsx` — 2 test files passed (9/9 tests).
