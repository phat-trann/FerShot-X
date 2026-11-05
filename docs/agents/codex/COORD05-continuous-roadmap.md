# COORD05 continuous full-function work allocation

Status: DONE for known-roadmap allocation and selector infrastructure. Date: 2026-11-05.

The user prioritized allocation before further Codex product integration. Existing worker queues were exhausted/submitted. Added 22 Antigravity tasks (A11-A32), 20 bounded Copilot tasks (P23-P42) and 10 Codex integration gates (C07-C16): 90 feature task definitions total, with 32 Antigravity, 42 Copilot and 16 Codex tasks. H01 remains a separate recurring hygiene lane. Existing submitted work is preserved and skipped rather than repeated.

CONTINUOUS.md lists every task, path boundary and dependency; FUNCTION-MAP.md maps all F01-F34 rows of the earlier static inventory to owners, exclusions and unknowns. No cloud/S3/FTP, license gates or telemetry added. The 0.1.0/frozen-version parity rule is preserved. Broader feature planning does not silently change the existing MVP denominator or claim target parity is verified.

New native modules are delegated as isolated Vision OCR/QR, clipboard import, pixel effects, scrolling stitcher and local archive cores. Antigravity performs functional tests only, no standalone build/format/lint. Copilot retains small named-input/file tasks and H01. Codex owns shared contracts, real native wiring/capabilities, integration builds and acceptance.

`next_task.py` reads current packets/decisions/hashes/claims. It prioritizes functional corrections, stale own snapshots and new numeric tasks. It skips occupied/missing scopes and current submitted work, recognizes newer fix packets, and supports --all/--claim. Root writes use root-wiring plus task claims; failed acquisitions release acquired own locks and skip. It selects metadata, does not execute arbitrary commands, launch/restart clients or poll. Blocked tasks need explicit RETRY after a real input change.

Validation: all 11 coordination Python tests passed (6 selector + 5 immutable packet/claim tests). Checked 90 unique task IDs, exact A01-A32/P01-P42 ranges, new prompt ownership parity, <=2-file new Copilot scopes, safe relative prerequisites, all 34 feature rows and local links. Live read-only selection found 22 new available Antigravity tasks and a Copilot functional correction/snapshot refresh followed by new P23+ work; missing A14 prerequisite correctly skips P35. No real worker claims were acquired by these demonstrations.

The inherited C04 pixel checkpoint was saved separately: 27 candidate functional tests, 3 adapter tests, final 12 browser E2E and scoped typecheck passed; initial full-build P19 type errors were subsequently fixed by Copilot and the follow-up full frontend build passed. No worker implementation was overwritten. No formatting/lint or native GUI/clipboard/capture operation was performed by Codex.

Known limits: this is the complete known functional plan, not proof that the initial static inventory is exhaustive or unknown target algorithms are recovered. User-only native acceptance and SDK/permission blockers may remain. Files cannot automatically start or restart external clients; the user pastes each kickoff once, then can resume the same command after interruption. MVP progress remains 47.5% until actual acceptance gates pass.
