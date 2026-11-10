# C67 manual native checks

Use the C67-macos-candidate.json bundle. Automated checks use synthetic images and injected OS boundaries.

- Launch on Retina and secondary monitors: editor occupies 80% of available work area and is centered. Resize normally.
- Close the editor using its red button. Reopen from menu bar/Dock; documents and queue remain. Command-Q quits immediately, including while Settings is focused. Interrupted FTP entries remain retryable on relaunch.
- Capture Area from the hidden app using an explicit user action. Release opens the editor; cancel restores its prior visibility. Verify Screen/Window and Repeat similarly.
- Edit a capture and Copy, Save or Upload: successful action hides the view. Save cancellation or immediate operation failure keeps it visible. Upload continues in the background; later failures remain in FTP history.
- Open Settings → Advanced, choose error retention days, and Open Logs Folder. Review structured error records after reproducing a failure. No successful/cancelled actions or sensitive content should be recorded.
- Confirm light/dark materials, keyboard tab navigation, reduced motion, normal focus, startup toggle and dock/menu reopening. Startup changes require your explicit toggle and were not performed by automation.
