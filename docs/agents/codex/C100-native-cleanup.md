# C100 native warning cleanup

Removed thirteen proven-retired files: Print/Pin native/UI/capability/test paths and five unreferenced interface wrappers. Removed their IPC exports, unused Print store initialization and Pin-only clipboard helper. Source/consumer checks precede deletion; original bytes were archived and hash-verified, with inventory in docs/maintenance/C100-retired-files.json. Git history and immutable authorship/evidence remain intact.

Normal activation replaces the deprecated ignoringOtherApps flag without a warning suppression or dependency upgrade. Active helpers and consumer-linked feature modules remain.

Passed: 441 unit tests, 64 injected native tests, TypeScript and production cargo rustc --lib -- -D warnings. Retired Print/Pin tests explain the count reduction. Version 1.1.2 is synchronized; CI owns distribution packaging. Formatting/lint not run; Copilot inactive. No real capture, permissions, FTP or updater installation performed. Acceptance stays 85%; macOS focus/scroll behavior requires manual verification.
