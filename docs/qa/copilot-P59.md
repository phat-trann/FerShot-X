# P59 Capture Workflow Regression Tests

Added three independent regressions for late completion after unmount,
replacement cleanup with stale-preview suppression, and explicit cancellation
preventing post-capture side effects. Checked the current A35 packet and claim;
no producer code was changed. Tests use deferred synthetic documents only.
