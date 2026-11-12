# C96 signing requirement clarification

Developer ID Application is not a prerequisite of the Tauri updater signature protocol. Updater artifacts require the actual Tauri public/private signing keypair; macOS app signing and Apple notarization are separate. Official Tauri macOS documentation supports ad-hoc signing without an Apple-authenticated identity. The current release workflow deliberately requires Apple credentials for Developer ID/notarized distribution; that is the configured pipeline policy, not a universal updater requirement.

Personal/ad-hoc distribution would require an explicit workflow change and real Gatekeeper, capture-permission and upgrade acceptance. No workflow/source changes, keys, credentials, builds or server actions were performed for this clarification. Official Tauri updater/macOS-signing and Apple Developer ID documentation were checked. Acceptance remains 85% before/after.
