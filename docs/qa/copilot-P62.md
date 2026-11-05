# Copilot P62

Added independent preview-action regressions for the A35 controller:

- rejected and synchronous failures from Copy, Save, Edit, OCR, and Pin keep the preview recoverable;
- duplicate clicks while an action is pending invoke the adapter once;
- a late preview completion is ignored after a newer capture supersedes it.

Validation:

`npm run test:unit -- src/testing/copilot-capture-preview-actions.test.tsx src/features/capture-workflow/CaptureWorkflowController.test.tsx`

Result: 2 files passed, 12 tests passed. Tests use synthetic documents and injected callbacks only; no producer code or root wiring changed.
