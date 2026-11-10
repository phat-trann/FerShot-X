# C82 annotation separators

Removed pseudo-element pipe separators from editor-tool-slot descendants of #editor-annotation-tools, including drawing and history controls. Output-group separators and existing drawing-group spacing remain. No logic, native code or layout sizing changed.

Validation: existing toolbar browser case run with injected IPC; screenshot inspected. No build, formatting or lint. Phase-2 acceptance remains 85% before and after.
