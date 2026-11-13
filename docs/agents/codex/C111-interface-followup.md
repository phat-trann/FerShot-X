# C111 — Interface follow-up

Consolidated Settings layout rules to remove conflicting margins and row reversal. Shared SwitchField renders label first and switch last in General, Advanced and FTP/HTTP forms. Navigation has 12px top inset, content 24px, groups 20px top padding, rows 12px gaps and groups 16px separation. FTP fields align in columns without compact-window horizontal overflow. Library tabs, Edit status cells, toolbar and overflow controls consume shared rounding.

Checks: 436 unit tests, 13 injected browser regressions and no-emit TypeScript pass. Compact Settings screenshots inspected. C110 evidence remains immutable; this packet refreshes changed snapshots. No native build, OS/server/credential actions, commit or push. Existing functional acceptance stays 100% USER_REPORTED; 1.1.11 remains a local candidate. User must explicitly accept before every commit/push.
