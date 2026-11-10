# C77 remove Compose images

Removed the Compose toolbar control and active workspace composition state, renderer callback and layout-source preparation. Direct tools now expose crop/resize/effects only, with no layout branch. Removed the obsolete browser composition case and asserted the Compose entry point is absent. Updated active README/release checklist. Isolated legacy layout utilities and historical evidence are preserved.

Checks: no-emit TypeScript passed; three focused injected browser cases passed (toolbar absence, crop/resize, overflow/history); version 1.0.0 synchronization passed. No application/native build, formatting or lint run. No native code changed.

Phase-2 acceptance remains 85% before and after.
