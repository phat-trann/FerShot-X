# Concrete integration compile handoffs

P61 functional correction: current root TypeScript compile fails at src/testing/copilot-preferences-workspace.test.tsx:62 because save.mock is unavailable on its declared plain function type. Fresh changes_requested decision records this. Acquire P61, correct the owned test typing, run the single test, resubmit, release.

H01 completed-file hygiene handoff: src/features/preferences-workspace/PreferencesWorkspace.tsx has unused DEFAULT_SETTINGS import (line 3), blocking the configured tsc build. No behavior change requested. Acquire H01 then ordinary A37 producer claim as copilot before removing only that unused import. This is a non-root producer file; do not edit any other producer source. If occupied skip. Submit changed snapshot and release. Codex is not running/fixing formatting/lint. Keep current clients; do not launch duplicate agents. Continue P83-P90 afterwards without review waiting.
