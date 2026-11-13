# C150 Lens placement and manipulation visibility

Active Magnifier output, border and connector hide while dragging source/lens or resizing. Transparent lens hit geometry remains so captured gestures finish normally. Release and cancellation restore visibility; source controls and other lenses remain independent. Legacy unlinked lens artwork also hides.

New lens placement uses a fixed 32-document-pixel edge gap. Among cardinal sides that contain the complete lens, choose greatest clearance; ties resolve deterministically. If none fit, choose the roomiest side and bound its center, allowing oversized lens clipping. Magnification-derived size and manual arbitrary-angle positioning remain unchanged.

Validation: TypeScript, five geometry unit cases and three browser cases pass, followed by two focused browser cases after legacy visibility refinement. Cases cover four placement directions, fixed gap across sizes, bounded fallback, source/lens drag, resize, release/Escape, source handles and Counter tracking. Version/whitespace checks pass. No build, OS/server action or publication; user visual acceptance pending.
