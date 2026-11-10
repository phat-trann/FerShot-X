# C57 — Antigravity A200–A202 source review and next allocation

Reviewed actual A200 editor/selection source and A201/A202 direct transform, effect and layout source/APIs; checked packet snapshot currency and reran the producer's seven-file suite: 26 passed. A201's shared index/test snapshot is stale after A202 exports. Passing these tests does not accept integration or native editor behavior.

| Packet | Decision and next scope |
| --- | --- |
| A200 20261109T112439-antigravity-A200-58fbbf7a | CHANGES_REQUESTED. Old prefixes remain although root selectors have changed; A203 completes naming and gesture state/pointer-loss regressions. C51 will pass busy/zoom through the actual consumers. |
| A201 20261109T112743-antigravity-A201-cec5fa81 | CHANGES_REQUESTED / stale snapshot. Full-image initial crop overlay body intercepts stage drag as move; native resize preserves aspect while this preview emits unrelated dimensions and clips enlargement. A204 owns current transform/effect source and regression corrections. |
| A202 20261109T113139-antigravity-A202-7a39597e | CHANGES_REQUESTED. Effect overlay interception, missing layout pointer capture, inset handle outside move/up handler subtree, absent usable setters for backdrop properties and incomplete preview. Six unused setters also block full typecheck. A204/A205 own corrections. |

Findings about hit testing/handler ancestry are source-derived from actual DOM/CSS/event handlers, not a claim that Codex completed browser drag acceptance. The source path and required reproduction cases are embedded in each new queue task. New work was assigned before the rest of the user request, through the real external Antigravity queue and a unique message file; no internal Antigravity worker was created. Exact scopes avoid root/Workspace and overlapping concurrent writers. Each task publishes a current packet; C51 consumes A203/A204/A205 after review. Copilot remains inactive with no new allocation.

No new phase-2 acceptance gate is credited. Phase 1 is separately user-accepted at 100%; phase 2 remains 25% pending corrected/integrated behavior and actual FTP acceptance.

Review precision correction: DirectEffectsSurface starts with an inset region up to 120×80 (x/y up to 16), not the full-image initial crop region. The earlier A202 note overgeneralized the crop hit-target finding to effects. Do not treat a full-image effects overlay as an observed fact. The effects correction is pointer capture/release-outside reliability and verification of region reselection; the confirmed layout/setter and crop findings remain. A204's queue text is corrected accordingly.
