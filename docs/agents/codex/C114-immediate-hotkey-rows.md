# C114 — Immediate hotkey rows

Replaced the Install/Remove form with seven reference-style labelled shortcut capsules and inline clear controls. Valid recording/clearing immediately uses the existing atomic configure command, preserving other assignments. Pending writes disable editing; confirmed values change only after acknowledgement. Native registration/persistence protocols are unchanged.

Physical Key/Digit normalization supports Shift-number and Option-letter chords. Duplicate/reserved/unsupported input is rejected; Escape/Tab/focus loss cancel and repeat/composition are ignored. macOS modifier glyphs replace verbose key labels. Explicit reset recovery remains available only for a faulted registry.

Checks: 441 unit tests, 19 focused injected browser regressions and TypeScript pass. Cases cover immediate save/clear, preservation, delayed/failed writes, reopening Settings and explicit recovery. Compact screenshot inspected. No build, real OS shortcut/server/credential actions, commit or push. Local 1.1.11 awaits user acceptance; existing functional acceptance remains 100% USER_REPORTED.
