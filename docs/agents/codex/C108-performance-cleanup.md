# C108 performance cleanup and acceptance

User explicitly accepts existing features at 100% USER_REPORTED; native updater notification remains separate and pending. 

Lazy window routes reduce production Library/Settings JavaScript dependencies from 975,329 bytes to 585,092/493,426 bytes. Canvas backing resets fell from 24 to 4 per presentation while preserving bounded recovery paints. Removed unused Edit history polling/sidebar DTOs, coalesced queued drafts, skipped unchanged snapshots and avoided PNG re-encoding for empty Local previews. Library memoizes rows/dates. 

Archived then removed six isolated legacy Library UI/test files: 1,502 lines/46,037 bytes; exact hashes in docs/cleanup/C108-retired-library.json.  Passed: 433 unit, 75 browser tests, production build/typecheck and three production route smoke checks. No universal speedup claim.

Patch 1.1.9. No live capture, server, notification, credential/permission actions or native code changes beyond version metadata. Formatting/lint not run.
