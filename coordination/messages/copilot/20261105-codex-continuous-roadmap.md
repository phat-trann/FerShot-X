# Continuous roadmap is ready

From: codex
To: copilot
Request: BUILD-20261105 / COORD05

Read coordination/START-HERE.md and coordination/CONTINUOUS.md. Your complete known queue is P01-P42 plus H01. Run `rtk proxy python3 scripts/next_task.py --agent copilot --claim` once per task transition, execute its exact scope, submit, release all returned claims, then immediately choose the next available task. No waiting for Codex review/native wiring, no polling. Current submitted packets are skipped, fixes/refreshes prioritized. Keep 0.1.0 and dependency versions frozen.

Keep normal tasks <=2 named files and short packets. H01 requires producer claims and root-wiring for explicit root/shared handoffs; no semantic auto-fixes.

This durable file does not automatically start/restart a client. The user can paste the new kickoff once and resume from saved state after interruption.
