# C79 unified interface palette

Applied the requested fixed charcoal (#232427), blue (#257EFE) and silver (#DEDEDF) palette across Edit, Library and Settings. Shared tokens define layered surfaces, muted text, borders, focus, hover and selected states. Settings consumes shared tokens instead of an independent OS-dependent palette; shadcn/Tailwind colors match the same values. Window backgrounds, scrollbars and selection borders use the palette. Destructive/warning semantics and actual image/annotation colors remain meaningful.

Checks: no-emit TypeScript and version 1.0.0 synchronization passed. Five injected browser cases passed for toolbar/status/overflow, Library and Settings keyboard/small-window behavior. Inspected screenshots of all three windows, including Settings under light and dark OS preferences. No application/native build, formatting or lint run. Native vibrancy appearance awaits manual verification on a requested build. Phase-2 acceptance remains 85% before and after.
