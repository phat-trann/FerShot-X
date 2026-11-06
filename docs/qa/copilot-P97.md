# P97 strict native accelerator adapter

Implemented `toNativeHotkeyBindings`: validates the existing five-action sidecar, maps the supported ASCII/named/function-key subset to Code spellings and returns an owned frozen nullable mapping. Canonical modifier order is Super, Control, Alt, Shift. Unsupported punctuation/multi-character strings are rejected rather than guessed. A second canonical validation prevents named Space from bypassing reserved/duplicate checks.

Node 26 `vitest run src/features/hotkey-wire-codec/index.test.ts` — 1 file, 36 tests passed. Coverage includes null ownership, modifier order, every supported named key, case/function/digit/letter mapping, unsupported keys, strict modifiers/types, reserved bindings and alias duplicates. Only the two named inputs were read; no root/native/dependency changes or OS registration occurred. Build/integration delegated to Codex. The subset is Ferby-specific, not target parity.
