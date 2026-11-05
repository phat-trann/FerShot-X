# P54 Archive Workflow Regression Tests

Added four public-API regressions covering staged lease cleanup on conflict,
duplicate-ID remapping without mutating the original library, and export
serialization that omits source URLs. The import success case also verifies
leases remain caller-owned after commit. Tests use synthetic injected archive
adapters only; no filesystem, network or producer implementation was changed.
