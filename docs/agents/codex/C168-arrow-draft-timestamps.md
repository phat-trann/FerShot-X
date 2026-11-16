# C168 — Arrow draft timestamp failure

Installed logs locate repeated failures at recording_save_draft. Playback supplies fractional millisecond positions; native draft fields are u64. Reproduced this contract mismatch and rounded cue commit times plus all draft IPC temporal fields for autosave, Save, Copy and FTP. Source drafts remain immutable and preview retains fractional timing. Nonfinite/out-of-budget values still fail. Invalid IPC arguments now receive safe invalid_input diagnostics without recording raw error strings or payloads.

Validation: TypeScript, 9 focused unit cases, native model/serde checks and 2 browser regressions (including play → pause → Arrow → autosave/upload) passed. No live capture/media/server/permissions, bundle/version bump or publication. Installed Arrow retest remains pending; logs alone do not prove the exact deserialization cause. USER_WAIVED_REVIEW only.
