# C94 immediate capture upload continuation

Reviewed the existing persisted native capture-upload option, IPC validation, capture routing, frozen FTP job snapshots, URL copying and recovery to Edit. The other client's cloud-upload icon/title-state change remains intact. File import and Add Image retain their explicit editing workflow.

Synthetic browser cases pass for successful immediate queueing without Edit presentation, asynchronous FTP failure reopening the captured image, and enqueue failure preserving pixels. C95 additionally defers successful native capture presentation to the renderer, preserving immediate-upload suppression.

Native persistence, actual menu state, capture cancellation and real server transfer remain manual acceptance requirements. No native compilation/build or real OS/server tests were run. This is source review and injected-boundary evidence, not independent approval or release acceptance. Acceptance remains 85%. The retained C94/root-wiring claims belong to this continuing Codex request; historical authorship and committed changes are preserved.
