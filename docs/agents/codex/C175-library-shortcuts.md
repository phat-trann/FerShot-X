# C175 — Library Copy/Delete shortcuts

Transferred stopped C175/root-wiring claims with user authorization and preserved unfinished LibraryWindow work. Previously, key handling was confined to the image list. Library now handles Cmd/Ctrl+C, select-all and Delete/Backspace from preview/toolbar focus too. Native WKWebView Copy events use the same Copy action when no keydown is delivered. Existing icon callbacks own all operations.

Text-editing contexts, hidden windows, modals, repeats and modified Copy remain excluded. FTP Delete still requires confirmation; uploading/operation guards and oldest-first link ordering remain intact. Native and keyboard Copy share the synchronous duplicate-operation guard.

Validation: TypeScript and seven distinct injected browser regressions passed, including Local copying/deletion, FTP order/confirmation, partial failure, text editing and busy duplicate suppression. No build/version/publication, live clipboard/server/permission actions. Installed macOS native Copy remains a manual retest. USER_WAIVED_REVIEW only.
