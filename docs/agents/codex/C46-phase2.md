# C46 — Phase 2 foundation

FerShot X 1.0.0 is the new product baseline, explicitly authorized on 2026-11-09. App/package metadata and visible full product name changed; existing bundle identifier/Rust library identity remain stable for settings/permissions continuity. Native macOS icon and PNG sizes are exact copies of the user-owned upload-screenshot build assets. No dependency upgrade. Three external lanes are queued with exclusive scopes and written handoffs; clients are not auto-launched.

FTP source read: uploader.ts, queue.ts, pathUtils.ts, shared/types.ts, renderer/pages/QueuePage.tsx. Old behavior allocates a timestamp name (day/hour/minute/second plus sequence), joins remoteDir to public base URL, and retries via four workers after filesystem stability. Phase 2 allocates one immutable target at explicit enqueue without a watcher; retries keep that target. No credentials were read or migrated. Phase-1 acceptance remains 87.50%; phase-2 gates start at 0%.
