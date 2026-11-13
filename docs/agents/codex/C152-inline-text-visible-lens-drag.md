# C152 Inline text and detached-lens visibility

Text opens a blank focused shared Input at image coordinates, with no placeholder annotation or toolbar field. Valid live typing updates drafts/output; Enter/blur commits one undo transaction and Escape restores the original. Empty placements save nothing. Double-click edits existing text, with IME-safe confirmation and typing shortcuts. Overlay font/color/scale follow annotation geometry; retyping preserves layer order.

Detached lens movement keeps zoomed content, border and connector visible. Source drag/resize still hides output. Missing-pointer sampling no longer requests unavailable Konva positions.

Validation: TypeScript, 424 unit cases and four initial browser cases passed. A later reopen test raced the new document presentation; the corrected final three-case rerun passed after awaiting the new ID/presentation. Covers blank caret, undo/redo, Escape, repeated placement, live Copy, draft reopen and lens visibility. Version/whitespace pass. No build, OS/server actions or publication; visual acceptance pending.
