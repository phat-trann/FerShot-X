# C28 native document-open source

Added macOS document declarations for PNG/JPEG/GIF/WebP as an alternate handler, and a separate 16-item native token queue for file-open events. Cold-start requests survive until acknowledged; paths never cross the frontend boundary. Reads require main-window tokens, regular nonsymlink files, inode/device consistency and a 20 MiB bound. MIME is detected from bytes; existing browser import validates decoding/dimensions and owns object URLs.

The workspace subscribes before reading, waits while busy, imports sequentially, reports failures without altering old images and acknowledges handled requests. Ferby URL intents remain separate and retain capture confirmation.

Original reference: T05-export-audit.md, Shottr1.9.3/137, REA ev_873e89b3dfe28175d06beecfaef6a625b85d61fd7e7f79c50888494f39633abd. Registration is static evidence, not original decoding/parity proof.

Tests/typechecks/builds: NOT RUN — deferred by user. No file-open UI/native actions executed. Formatting/lint delegated to Copilot H01. USER_WAIVED_REVIEW; later overall review required. MVP acceptance remains68.75%.
