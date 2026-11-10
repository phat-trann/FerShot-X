# C88 restored surfaces and typography

Restored #232427 base/card/sidebar/glass and #303136 elevated surfaces. Retained accent, primary/secondary text and selected colors. Centralized native macOS font tokens, increased main controls/labels to 13px, used medium small titles and clearer captions/status text. Image/annotation fonts are unchanged; no font files or dependencies copied.

Reference: STATIC_OBSERVED archived REA ev_7a54c59efe5ad259d8b8b7c187965d29df9ca99f3686ffa068c92add599df2ca, Main.storyboardc/NSWindowController-B8D-0N-5wS.nib objects 41/175/431/528 declare native system fonts; object 794 declares HelveticaNeue 12. Target 1.9.3 build 137 identity and resource hashes are recorded in C88-font-reference.json. These do not prove complete runtime typography.

Checks: no-emit TypeScript, six focused browser cases and version synchronization recorded in packet. No build, formatting/lint or new unit tests for CSS-only changes. Acceptance remains 85% before/after; native visual verification deferred.
