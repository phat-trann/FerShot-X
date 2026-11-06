# P92 archive workspace lifecycle

Four RTL regressions pass with the archive workflow factory/run boundary injected: render does not start work, duplicate import is suppressed, Cancel reaches the active controller, conflict and successful export statuses are distinct, errors restore actions, and unmount cancels while a late commit is refused. Only the named workspace/controller inputs were read; producer code is unchanged.

Command: Node 26 `vitest run src/testing/copilot-archive-workspace.test.tsx` — 1 file, 4 tests passed. No file dialogs, URL creation, native actions or persistence occurred. No functional defect found in covered cases. Build/integration delegated to Codex; these callback tests do not establish native archive acceptance or Shottr parity.

Follow-up: replaced unsupported RTL role-query `exact` option with an anchored name regex after Codex integration compile feedback; all four targeted tests still pass. No assertion weakened.
