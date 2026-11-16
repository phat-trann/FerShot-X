# C170 — Direct recording stop from app tray

Historical implementation, removed by C171 at the user’s request. Current app tray stays unchanged; Settings provides a dedicated Stop recording shortcut.

The existing app tray silhouette gains a red recording treatment/stop badge and elapsed-time tooltip. A left release during recording sends the existing native stop request directly. A phase gate and atomic one-shot guard suppress duplicate, starting and finalizing requests. Normal template artwork and menu behavior return on completion/cancellation/failure; right-click menu access remains. Recreated tray icons inherit active state. Artwork updates atomically with template status only on phase changes, avoiding per-second rasterization/flicker.

Validation: focused native menu tests cover click gating, duplicate suppression, generated artwork and existing menu mappings. No real recording/input/server/permission operations, app bundle, version bump or publication. Installed tray appearance and stop-to-Edit remain manual acceptance. USER_WAIVED_REVIEW only.
