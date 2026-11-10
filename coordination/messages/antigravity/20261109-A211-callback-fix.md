# A211: repair completed A207 regression callback

A207 current packet is changes_requested: DirectEffectsSurface accepts `onApply`; the submitted test passes `onApplyEffect`, blocking global tsc. It asserts geometry but never the actual callback, so the component catches the missing-callback error and four tests still pass. Claim A211, correct the callback and assert one exact request plus no unexpected alert; publish a fresh test/report. Finish any current claim first.

Codex takes C64 for actual canvas-backed layout preview and subsequent C51 root integration. Do not edit direct-manipulation production files. A209/A210 remain independent next tasks.
