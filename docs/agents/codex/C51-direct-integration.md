# C51 direct editor integration

Integrated reviewed editor/gesture and direct manipulation APIs into the actual Workspace. Crop/Resize and region effects act on the central edited image and create source-preserving derivatives. Compose now supports draggable layers, canvas resizing and backdrop inset, with active annotated sources prepared/disposed lazily and matching raster preview/export. Numeric transform/layout panels were archived after reference checks. Window-appearance output returns to the editor. Library receives busy guards; editor gets effective Fit/zoom and inactive-mode disabling.

A214 resolves the independent stale-zoom defect from A209; reviewed source and 22 relevant tests passed. Existing basic editor history/undo/merge and annotated Copy/Save browser regressions passed. The final 32-case integrated browser batch passed across direct tools, gradient/radial/image composition, retention, FTP/logs, cancellation and small-viewport UI. The added FTP panel case validates coded retry errors. C64 adds exact preview/export pixel hash equality and unchanged source-decode/PNG-encode counts while dragging.

Phase-2 direct-editor synthetic/browser acceptance: 40% → 55%. Native capture/network boundaries in browser tests are injected; real FTP upload acceptance remains pending. Codex USER_WAIVED_REVIEW. Formatting/lint not run.
