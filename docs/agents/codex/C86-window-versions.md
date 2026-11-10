# C86 window versions

All Edit, Library and Settings title bars show the same right-aligned muted version label. The shared WindowTitleBar reads APP_VERSION from app-info, which reads package.json; removed the Settings-only duplicate. Future canonical product version changes propagate to all three windows without separate literals. Native drag regions and title alignment are preserved.

Validation: version 1.0.0 synchronization, no-emit TypeScript and three focused existing browser cases recorded in the packet. No build, formatting or lint. Phase-2 acceptance remains 85% before and after.
