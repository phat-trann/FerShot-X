# C91 editor behavior corrections

Opening zoom now uses 100%/80% presets against available display size, avoiding the compact-window Fit feedback that produced values such as 93%. Explicit Fit still calculates the actual viewport scale.

Add Image now inserts a movable, proportionally resizable embedded PNG layer into the current document; file/capture cancellation preserves it. Removed the Clipboard entry, tooltip and Command-O binding. Image layers participate in undo/redo, geometric mapping, export and Local drafts. Embedded PNGs validate signature/dimensions and have a 12 MiB limit; 32 MiB drafts share the existing total private-cache quota with pixels.

Freehand keeps its tool active on blank clicks, creates no empty stroke, and offers movement/color without resize or size controls. Tests cover zoom boundaries, compact-window regression, insertion/export/resize/history, draft validation and Freehand behavior. 435 unit tests and 50 distinct synthetic browser cases passed across full/focused runs. Native compilation, cache tests and OS/server checks remain deferred. Acceptance stays 85%.
