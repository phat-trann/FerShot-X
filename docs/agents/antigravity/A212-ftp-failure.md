# A212 — Actionable Privacy-Safe FTP Failure Panel

## Summary
- Implemented `FtpFailurePanel` (`src/features/ftp-failure/FtpFailurePanel.tsx`, `src/features/ftp-failure/FtpFailurePanel.css`, `src/features/ftp-failure/index.ts`) accepting `{ code: string | null, message: string, busy: boolean, onRetry?: () => void, onOpenSettings?: () => void }`.
- Provided concise English recovery guidance for `ftp_timeout`, `ftp_connection`, `ftp_authentication`, `ftp_tls`, `ftp_credentials`, and `ftp_failed`, plus a safe `unknown` fallback when `code` is `null` or unrecognized.
- Explicitly stated in `ftp_timeout` guidance that passive data-port (`PASV`/`EPSV`) or server timeouts are network/firewall transfer delays and **do not** prove a wrong stored password.
- Added `sanitizeFtpFailureMessage` so accidental URLs (`ftp://`, `ftps://`, `http://`, `https://`), `user:pass@host` credentials, `password=...`/`token=...` fragments, IPv4 addresses, and `host:port` endpoints are redacted (`[redacted-*]`) and never rendered or logged.
- Provided accessible `Retry upload` and `Open FTP settings` action buttons with `disabled` and `aria-disabled` guards while `busy={true}`.

## Verification
- `npx vitest run src/features/ftp-failure/FtpFailurePanel.test.tsx`: **1 file passed (5/5 tests)**.
