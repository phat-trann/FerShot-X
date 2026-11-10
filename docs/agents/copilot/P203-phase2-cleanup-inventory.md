# P203 Phase 2 cleanup inventory

These are proposed removals for Codex C48, not performed by Copilot. They
implement the Phase 2 English-only/no-OCR cleanup and must be checked against
current Workspace imports before archiving:

| Candidate | Size | Reason |
|---|---:|---|
| `src/features/ocr-languages/` | 8K | Removed language controls |
| `src/features/ocr-panel/` | 24K | Removed OCR UI |
| `src/features/ocr-text/` | 8K | Removed text-recognition surface |
| `src/features/recognition-profile-panel/` | 24K | Recognition-only UI |
| `src/features/recognition-workflow/` | 20K | Recognition-only workflow |
| `src/features/recognition-workspace/` | 16K | Recognition-only workspace |
| `src/features/vision-backend-adapter/` | 20K | OCR backend adapter |
| `src/Workspace.recognition.tsx` | 8K | Recognition workspace wiring |
| `src/platform/recognition.ts` | 4K | Recognition IPC boundary |
| `src-tauri/src/recognition.rs` | 8K | Native recognition commands |
| `src-tauri/src/recognition_preferences.rs` | 4K | Recognition settings |

Do not delete review packets, decisions, reports, user images, or shared
manifests/locks. Archive any confirmed obsolete source before deletion.
