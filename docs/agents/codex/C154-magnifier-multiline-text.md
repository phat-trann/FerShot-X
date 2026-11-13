# C154 ellipse resizing and multiline Text

Magnifier now exposes eight source resize anchors with independent axes. Both linked and legacy radii persist separately; linked output remains tied to magnification while its detached center stays fixed. Freehand and image policies are unchanged.

Inline text uses a shared Textarea, with 4px padding outside the original document text anchor. Shift+Enter inserts a newline; Enter commits and Escape cancels. Multiline selection bounds and PNG rendering use the same line spacing as Konva. Draft, undo/redo and empty-text behavior remain intact.

Validation: TypeScript, 11 targeted unit/source checks and seven injected browser cases pass. Browser checks cover circle-to-ellipse drag, preserved lens magnification, undo/redo, padded text at 100/200%, newline persistence, selection bounds and actual second-line exported pixels, plus existing text/reopen and Magnifier visibility regressions. No build, native/server action or publication. User visual acceptance remains pending.
