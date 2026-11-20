# C182 — FerShot X source review fixes

Implemented R01–R12 from [C181](C181-source-review.md). The owner waived independent review for this change. Overall review and installed macOS acceptance remain due. Recorded MVP acceptance stays at 100%.

| Findings | Changes |
| --- | --- |
| R01 | Journal Local image, metadata and draft changes under one filesystem lock. Recover interrupted writes and deletes, retain committed entries during cleanup, and keep healthy rows readable alongside damaged legacy files. |
| R02 | Resolve upload and delete reservations under the same lock order, including queue history removal. |
| R03 | Run recording retention outside reads. Pin queued opens, previews and the specific Edit session. Defer post-upload cleanup until those owners release the recording. |
| R04 | Use `panic = "unwind"` in release so a Rust recording worker panic can release its job and stop channel. |
| R05–R06 | Surface write failures at required save boundaries. Keep the current draft on failure and release committed image resources after close or replacement. Save native PNG bytes even while Edit is waiting for its first decode. |
| R07–R09 | Load Local images, recordings and FTP history independently. Refresh image previews on content changes and preserve unchanged video playback and FTP previews across unrelated refreshes. |
| R10–R11 | Enforce video layer locks in the Delete handler as well as the toolbar. Start FTP transfer even when copying the predicted URL fails. |
| R12 | Preserve sanitized crash time, source version and macOS bundle build. Record safe Rust panic locations and report skipped diagnostics. |

The journal preserves the deployed file layout and draft compatibility. Existing damaged rows remain on disk for recovery. The release panic policy handles Rust unwinding. The prior Live Text crash involved AppKit gesture cancellation and still needs installed retesting. The browser cases inject IPC and validate handoff and state transitions using generated media.

## Verification

- TypeScript with `--noEmit --noUnusedLocals --noUnusedParameters` passed.
- Vitest passed 442 tests.
- Playwright passed all 103 injected cases across the six affected Edit, Library, recording and Live Text specs on the final run.
- Native Rust passed 125 tests with two FTP loopback wire tests excluded. The Local cache crate passed 19 additional tests.
- `cargo check --release --locked` passed on macOS.

Installed acceptance still covers repeated capture-to-Edit and Record Area-to-Edit handoffs, FTP retry and deletion against the configured server, and Library Live Text zoom and selection across close or image replacement. The release remains local at 1.5.0.
