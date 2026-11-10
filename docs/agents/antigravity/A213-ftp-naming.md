# A213 — Independent Saved FTP Filename Settings Regressions

## Summary
- Added `src/testing/antigravity-ftp-naming-settings.test.tsx` exercising real `WorkspaceFtpSettings` (`src/Workspace.ftp.tsx`) against injected `@tauri-apps/api/core` IPC (`isTauri` + `invoke`) without production code changes, credentials, or real network connections.
- Verified:
  1. **Legacy profile fallback**: Profiles returned by `ftp_read_settings` without a `namingMode` key merge onto `DEFAULT` (`{ ...DEFAULT, ...settings }`) and default to `"random"`.
  2. **Persisting `timestamp` and `random`**: Changing the `Upload filename` `<select>` between `"timestamp"` and `"random"` updates the helper description and sends the exact `namingMode` in `ftp_save_settings`.
  3. **Blank password stays `null`**: Saving with an empty password field sends `password: null` (`password || null`) so existing Keychain credentials are preserved.
  4. **Pending save disables changes**: While `ftp_save_settings` is unresolved, the `<fieldset>` is `disabled`, the submit button displays `"Saving…"`, and duplicate form submissions are ignored.
  5. **Failed save preserves selection & retries**: If `ftp_save_settings` rejects, `WorkspaceFtpSettings` surfaces the error in `role="status"`, re-enables the form, preserves the user's `"timestamp"` selection, and succeeds on subsequent retry.

## Functional Note for Codex
- In `src/Workspace.ftp.tsx:15`, `setValue({ ...DEFAULT, ...settings })` defaults `namingMode` to `"random"` when `namingMode` is omitted in JSON, which matches Rust `#[serde(default)]` / omitted keys. If a mock or caller ever passes an object with an explicit `{ namingMode: undefined }` property key, object spread would overwrite `DEFAULT.namingMode` with `undefined`; normalizing `namingMode: settings.namingMode ?? "random"` is an optional defensive hardening if needed.

## Verification
- `npx vitest run src/testing/antigravity-ftp-naming-settings.test.tsx`: **1 file passed (3/3 tests)**.
