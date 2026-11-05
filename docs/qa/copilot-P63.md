# Copilot P63

Added independent A35 lifecycle regressions:

- release callback replacement during a pending preview action uses the latest callback;
- timeout cleanup releases the source once, including after unmount;
- closing two captures with the same document ID releases each capture independently.

Validation:

`npm run test:unit -- src/testing/copilot-capture-workflow-lifecycle.test.tsx src/features/capture-workflow/CaptureWorkflowController.test.tsx`

Result: 2 files passed, 12 tests passed. Tests use synthetic documents, fake timers, and injected callbacks only; no producer code or root wiring changed.
