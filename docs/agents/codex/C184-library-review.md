# C184 — Library refresh and preview review

- Local autosave, recording changes and FTP events now refresh their own collections. An update received during a read triggers a fresh pass for that collection. Older unscoped Library events refresh both Local collections.
- Preview pixels, video leases and load failures follow the selected media revision. Live Text is disabled while the selected image loads. Retry bypasses the FTP video cache once and preserves unrelated image cache entries.
- The current recording event takes precedence over a delayed startup status. Preview actions use a compact group with shared icon sizes, and contextual errors use the shared status component.
- Validate recording settings across IPC so a malformed response leaves the rest of Settings available.

TypeScript, Rust release checking, 442 unit tests and 115 injected browser cases passed. Apple Silicon runtime behavior and configured FTP remain manual acceptance. Source push keeps 1.5.1 and its existing release run separate. MVP acceptance stays at 100%. Formatting/lint delegated to Copilot H01.
