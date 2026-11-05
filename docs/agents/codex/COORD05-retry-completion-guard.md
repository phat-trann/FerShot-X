# COORD05: Explicit retry stops after completion

While resuming Copilot's recovered Rust tasks, source review found the dispatcher kept selecting a task with state RETRY even after a fresh done packet existed. Restricted explicit retry to partial/blocked packets, preserving stale snapshot and fresh functional-correction priority. A focused regression proves a blocked task resumes once and a later complete packet advances to the next task. All 13 selector tests passed. No producer code or acceptance gate was changed by this coordination fix.

Existing independent/self-review and final gates remain unchanged. Code changes to this helper require independent review. Formatting/lint delegated to Copilot H01. Root-wiring and COORD05 claims were acquired for this shared helper fix and released after packet publication.
