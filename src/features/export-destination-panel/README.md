# Export Destination Panel

This controlled React component exports `ExportDestinationPanel` and `validateBasename` for managing export filename templates and destination folder selections.

- **Basename Validation**: Bounds file basename to 1–80 visible characters, rejecting slashes (`/`, `\`), control characters, and reserved names (`.`, `..`). Errors are shown inline without coercing or mutating user input.
- **Folder Controls**: Displays current folder label or default capture location fallback. Dedicated "Choose Folder" and "Reset Folder" buttons include busy guards and dispatches callbacks.
- **Controlled Seam**: No filesystem reads/writes or native OS file pickers are performed here. Codex integrates native directory capabilities and persistence.

