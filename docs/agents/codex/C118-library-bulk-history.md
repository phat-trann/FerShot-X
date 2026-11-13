# C118 Library bulk history removal

FTP's selection toolbar now exposes Remove history alongside Copy links and confirmed remote deletion. It applies `ftp_remove` to selected entries only; Local originals and remote files remain intact. Uploading selections disable removal. Partial failures retain unfinished selections for retry without repeating successful removals.

Removed duplicate Copy/Delete/Remove actions from both preview footers. Unique Edit, Refresh and Retry upload actions remain. The compact selection toolbar fits the 800×540 minimum Library window.

Validation: no-emit TypeScript and 10 focused injected browser regressions passed, covering history removal, partial failure/retry, active uploads, remote confirmation/deletion, authenticated previews and Local multi-copy. The compact-window screenshot was inspected. No real FTP/OS operations, build, commit or push. User acceptance remains pending for these changes.
