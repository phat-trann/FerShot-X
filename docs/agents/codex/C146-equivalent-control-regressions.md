# C146 Equivalent-control audit

Audited feature hover borders/opacity and shared controls across Settings, Library and Edit. Removed recurring accent hover borders in ColorFormatControls and SourceRestoreControls. Shared framed Button now retains its semantic border on hover and enforces enabled/disabled opacity consistently. Plain canvas controls, hotkey recording and semantic destructive/success/warning states remain specialized.

ToolHint asChild now composes child event handlers/ref and preserves existing accessibility descriptions/shortcuts; wrapped controls also retain those attributes. Pixel-aligned tooltip positioning remains.

Regression protection adds a feature-CSS guard against ordinary accent hover borders, interaction/ref tests and browser audit of visible framed actions across Settings tabs and both Library tabs. Existing Edit flat-tool, Resize, metadata geometry, inline utility and actual/absent updater-state cases pass.

Validation: TypeScript, all 419 unit cases and eight injected browser cases pass. Version/whitespace checks pass. No build, native OS/server actions, commit or push; installed appearance/window behavior remains user acceptance.
