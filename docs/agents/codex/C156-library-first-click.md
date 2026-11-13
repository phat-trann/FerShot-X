# C156 Library first mouse

User clarified the repeated clicks target the Local list row. The row deliberately selects on one click and opens Edit on double-click. Library’s native acceptFirstMouse was omitted; the installed Tauri SDK documents a default of false, so an inactive window may consume its first click for activation.

Enable acceptFirstMouse for Library only. Preserve Local double-click Edit, FTP double-click browser, modifier multiselection and other window controls. This addresses a plausible third-click cause without replacing row selection with immediate opening.

Validation: option/type/default confirmed against the pinned SDK schema. Existing injected Library double-click and bulk-selection regressions are run. Browser tests cannot establish native inactive-window mouse delivery. No build, real OS/server action or publication. User must verify double-click from both active and inactive Library in the next authorized app build.
