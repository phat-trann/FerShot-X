# C87 editor interaction repair

Reviewed existing external-client editor changes and preserved input hashes. Removed mode changes during manipulation, duplicate Transformer start and stale hit-graph updates. Fresh selected bodies/handles move/resize while drawing stays active; blank clicks choose Select. Select hover is transient and excluded from color sampling/export.

Counter has a rounded pointed corner with click/drag/keyboard direction control, independently persisted/exported as counterAngle. Number remains upright; invalid angles are rejected. Added shared radio styling; darkened base/elevated surfaces by 30%, retained compact annotation spacing and corrected overflow width accounting/pointer-focus flashing.

Added a consolidated 1.0.0 manual acceptance matrix.

Checks: 428 unit tests, 35 browser cases plus final focused gesture/counter/toolbar checks, no-emit TypeScript and version guard passed. Counter-tail export pixels, draft orientation and hover sampling verified. Screenshots inspected. No native build, formatting/lint or real server actions. Phase-2 acceptance remains 85%; actual native/release verification pending.
