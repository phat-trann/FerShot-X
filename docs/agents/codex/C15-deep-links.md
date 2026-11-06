# C15 native Ferby deep links

Implemented macOS URL delivery with the frozen Tauri RunEvent::Opened API and a bundle Info.plist declaration for the Ferby-only scheme. No new dependency, dynamic registration, install or OS URL launch was performed. The native queue holds at most 16 bounded links; only the main window can read/acknowledge. Reads preserve cold-start requests until resolved.

Frontend subscribes before reading, uses P37/C21 route validation and confirmation policy, rejects unknown session images and waits through busy operations. Capture/editor actions require explicit confirmation; source/revision changes invalidate confirmation. No image paths or external URLs are opened.

Checks: TypeScript no-emit, locked offline Rust compilation and plist parsing passed. Tests: NOT RUN — deferred by user. Formatting/lint delegated to Copilot H01. Native installed-bundle URL delivery remains unverified; proprietary Shottr routes remain UNKNOWN. USER_WAIVED_REVIEW; later overall review required. MVP acceptance stays 68.75%.
