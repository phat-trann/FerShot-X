# P55 Lifecycle Policy Regression Tests

Added four public-API regressions covering duplicate intent suppression,
deep-link confirmation and stale-token rejection, revision invalidation of
pending save confirmation, and dispatch of accepted effects only. Tests use
in-memory synthetic intents/context; no URL activation, OS action, save,
clipboard or producer implementation was exercised.
