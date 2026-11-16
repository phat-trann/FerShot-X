# C167 — Compact layer viewport

Moved Arrow/Text/Cover after Select/Highlight using valid integer toolbar orders; fractional CSS order had placed them with output tools. Timeline shows at most 3.5 rows (98px at 28px per row), with a separate 42px ruler. Layer-control gutter and virtualized clip area synchronize vertical scrolling in either direction. Existing clip/trim/selection/lock behavior remains.

Validation: TypeScript passed; three injected browser cases passed for actual toolbar positions, bounded viewport/scroll alignment, video annotations and independent layer selection. Inspected C167 screenshot; diff check passed. No native compile/build, OS/server operations, version bump or publication. Installed appearance remains pending user acceptance. USER_WAIVED_REVIEW only.
