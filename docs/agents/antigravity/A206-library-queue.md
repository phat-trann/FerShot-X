# A206 — Local/FTP Library Keyboard & Queue Usability

## Summary
- Enhanced `LibraryPanel` (`src/features/library/LibraryPanel.tsx` and `src/features/library/LibraryPanel.css`) while preserving all existing public `LibraryPanelProps & Phase2LibraryProps` and `uploadedSourceIds` filtering.
- **Keyboard Selection & Actions**:
  - Added `ArrowRight` / `ArrowLeft` / `Home` / `End` keyboard roving and tab switching on the `Local` and `FTP` tablist buttons.
  - Added `ArrowDown` / `ArrowRight` / `ArrowUp` / `ArrowLeft` / `Home` / `End` focus + selection roving and `Delete` / `Backspace` removal on Local library items.
  - Added `ArrowDown` / `ArrowRight` / `ArrowUp` / `ArrowLeft` / `Home` / `End` focus + selection roving, `R` retry (`pending`/`failed`), `C` copy URL, and `Delete` / `Backspace` history removal on FTP queue items.
  - Added `Escape` key handling on the search input to clear an active filter query.
- **Selected-Detail Updates After Retry & Removal**:
  - Automatically synchronizes `selectedUploadId` when an upload is retried or removed (or filtered out), advancing selection to the next available item in `filteredUploads` (or `null` when empty) and live-updating status, URL status, and error alerts in `Selected upload details`.
- **Pending vs. Failed vs. Successful URL Status**:
  - Clearly distinguishes `Pending URL: ...` (`Queued (pending URL)` / `Uploading (pending URL)`), `Target URL (upload failed): ...` (`Upload failed (URL not live)`), and `Uploaded URL: ...` (`Uploaded (live URL)`) in both queue list items and `Selected upload details`.
- **Empty & Search Results**:
  - Fixed Local filter empty state when `uploadedSourceIds` is non-empty so search misses display `No images match “...”` instead of falsely reporting that all session sources were uploaded.
  - Distinguished empty FTP queue (`No FTP uploads in queue.`) from empty search filter results (`No FTP uploads match “...”.`).
- **Disabled / Busy Actions**:
  - Added optional `busy?: boolean` and `disabled?: boolean` props to `Phase2LibraryProps`, disabling and guarding destructive/retry buttons and keyboard shortcuts when busy or when an FTP item has `status === "uploading"`.

## Verification
- `npx vitest run src/features/library/LibraryPanel.test.tsx src/testing/antigravity-library-queue.test.tsx` — 2 test files passed (9/9 tests).
