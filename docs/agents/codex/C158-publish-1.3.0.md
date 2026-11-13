# C158 release 1.3.0

User explicitly authorizes publishing completed C148-C157. Product version 1.3.0 is synchronized across npm/native manifests and locks, Tauri metadata and README; release notes summarize editor and Library changes. Keep existing ARM-only main-triggered release workflow, updater key and certificate identity.

Validation: production renderer build, root Rust cargo check --locked --tests, all 426 unit tests and 73 browser cases pass. Five browser assertions were stale against user-requested behavior and passed after updating expectations; the other 68 passed unchanged. Release-version (8), manifest (10), updater configuration (7), signing (11) and release gate (8) tests pass. Version and whitespace checks pass.

Normal main commit/push is authorized. CI packaging/publication and installed update/window/permission behavior remain separate from local automated evidence. No live capture, server, credential, Keychain or permission actions were performed. CI publication will be reported after push.
