# C81 Settings and upload folders

Primary text/icons are white; secondary text stays silver. Focus outlines/rings and visited recoloring are removed with keyboard focus brightness retained. Settings defaults/minimum shrink from 760×700 to 532×490. Contained scrolling also fixes Radix hidden-input overflow.

FTP config separates a fixed user folder from optional local YYMM grouping. Native enqueue freezes the effective folder in each job; retries retain it. Legacy profile YYMM suffixes split without rewriting old files; queued snapshots are not reinterpreted.

Startup already uses tauri-plugin-autostart and requires an installed .app. Unavailable/error state now explains why and offers status retry; supported toggling is browser-tested.

Checks: 10 browser cases plus final toolbar rerun, three FTP unit cases, no-emit TypeScript and version guard passed. Native folder regressions written but NOT RUN; no native compilation/build or real FTP/startup actions. Formatting/lint not run. Native retest pending; phase-2 acceptance 85% before/after.
