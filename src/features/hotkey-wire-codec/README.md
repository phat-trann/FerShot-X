# Native shortcut wire adapter

`toNativeHotkeyBindings` validates all five nullable actions through the existing
sidecar codec, then returns an owned frozen accelerator mapping. Modifiers are
ordered `Super+Control+Alt+Shift`; `metaKey` means Super, `ctrlKey` Control.

The supported Ferby key subset is ASCII letters (`KeyA`–`KeyZ`), digits
(`Digit0`–`Digit9`), F1–F24 and Enter/Escape/Tab/Space/Backspace/Delete/Insert/
Home/End/PageUp/PageDown/ArrowLeft/ArrowRight/ArrowUp/ArrowDown. Named keys are
case-insensitive; literal space maps to Space. Other strings and punctuation
are rejected without trimming or guessing. Supported aliases still share
reserved-key and duplicate checks.

This pure adapter performs no registration, OS calls or I/O. Codex C13 owns
the native parser, registration and permission/conflict handling. The subset
is a Ferby decision, not claimed recovered Shottr behavior.
