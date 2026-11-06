# Recognition Profile Panel

Controlled settings component for configuring recognition preferences:
- **Mode Selection**: Allows choosing between `both`, `ocr`, and `qr` modes.
- **OCR Language Selections**: Enables toggling available runtime-supported languages and adding custom tags up to a maximum limit of 16 tags.
- **Line Break Preservation**: Checkbox for `preserveLineBreaks` boolean.
- **Shape Validation**: Validates current preferences against `parseRecognitionPreferences` from `recognition-preferences-codec`.
- **Save & Reset**: Explicit buttons with busy guards to commit or revert preferences.

Never auto-recognizes images or performs clipboard operations. Codex C27 integrates this panel with persistence.

