# C131 Centered window opening

Edit, Library and Settings now share native active-display centering on opening/reopening, including retained windows moved by the user. Startup and Edit sizing use the same monitor resolver. Centering uses monitor work areas and actual physical outer dimensions, re-reading after cross-display movement to account for scale changes. No window dimensions or renderer geometry changed.

Validation: reviewed every product presentation path and verified the APIs against the locally locked Tauri source. Added pure geometry cases for negative origins, mixed-scale physical areas, oversized windows and common window sizes. These native tests were not compiled/executed because native compilation/build remains unauthorized. Real multi-display opening/reopening requires a later installed-app retest. No live OS actions, build, commit or push.
