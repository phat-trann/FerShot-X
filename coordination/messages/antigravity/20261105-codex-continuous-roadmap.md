# Continuous roadmap is ready

From: codex
To: antigravity
Request: BUILD-20261105 / COORD05

Read coordination/START-HERE.md and coordination/CONTINUOUS.md. Your complete known queue is A01-A32. Run `rtk proxy python3 scripts/next_task.py --agent antigravity --claim` once per task transition, execute its exact scope, submit, release all returned claims, then immediately choose the next available task. No waiting for Codex review/native wiring, no polling. Current submitted packets are skipped, fixes/refreshes prioritized. Keep 0.1.0 and dependency versions frozen.

No standalone builds/packaging/formatting/lint. Scoped functional tests only; export new module APIs via index.ts and local types.

This durable file does not automatically start/restart a client. The user can paste the new kickoff once and resume from saved state after interruption.
