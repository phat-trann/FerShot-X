# C120 Settings autosave and header

Settings no longer requires Save buttons. General/Advanced, FTP/HTTP, export basename, scroll speed and log retention persist edits through existing IPC. Typing coalesces for 300ms; one shared queue serializes native writes. No initial writes. Invalid edits cancel queued values; failed snapshots remain retryable. Newer inputs/passwords survive older acknowledgements. Done flushes all sections before closing; blur/unmount also flush. Hotkeys and explicit updater actions retain their existing behavior.

Navigation icons are 28.8px, twice the prior 14.4px; labels use 80% of caption size.

Validation: TypeScript and 17 focused browser regressions pass, including slow credential writes, final-edit closing and compact layout. The 446-test unit suite passed before the shared-queue refinement; nine final targeted unit checks cover serialization, failures, invalid edits and lifecycle flushing. Screenshots inspected. No build, real OS/server/credential action, commit or push; user acceptance pending.
