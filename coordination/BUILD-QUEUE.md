# Product build queue

Stack: Tauri 2 + Rust + React/TypeScript. Request ID: `BUILD-20261105`. C00 supplies the runnable foundation. Claims, completion packets and Codex review decisions are authoritative; this table reserves file ownership and is not a dispatcher.

| Task | Agent | Scope | Owned paths | Ready policy |
| --- | --- | --- | --- | --- |
| C00 | codex | Tauri/Rust foundation, toolchain, contracts and review workflow | Shared application/configuration and coordination infrastructure | DONE; see validation and completion packet |
| C01 | codex | Annotation model and history | `src/features/editor/model/**` | READY |
| C02 | codex | macOS capture core | `src-tauri/crates/capture-core/**` | READY |
| C03 | codex | Image transform and export core | `src-tauri/crates/image-core/**` | READY |
| C04 | codex | Review and integrate available modules | `src/Workspace.*; src/platform/**; src-tauri/src/**; root manifests/configs/lockfiles` | WHEN_AVAILABLE |
| C05 | codex | Foundation regression and native boundary hardening | `tests/e2e/codex-regressions.spec.ts; src/platform/**; src-tauri/src/**` | READY |
| A01 | antigravity | Capture panel | `src/features/capture/**` | READY |
| A02 | antigravity | Session library panel | `src/features/library/**` | READY |
| A03 | antigravity | Ferby settings panel | `src/features/settings/**` | READY |
| A04 | antigravity | Editor interaction view | `src/features/editor/view/**` | READY |
| A05 | antigravity | Pin and preview presentation | `src/features/pin/**` | READY |
| P01 | copilot | Color formatting utilities | `src/features/color/**` | READY |
| P02 | copilot | Measurement utilities | `src/features/measurement/**` | READY |
| P03 | copilot | Editor shortcut matching | `src/features/shortcuts/**` | READY |
| P04 | copilot | Export filename utilities | `src/features/export/names.ts; src/features/export/names.test.ts` | READY |
| P05 | copilot | Bounded baseline accessibility review | `docs/qa/copilot-P05.md` | READY |

Workers take their own tasks in order, skip claimed/blocked items, publish a completion packet after each task and continue without waiting for review. C04 consumes whatever is available; missing packets are not a reason to poll. C05 remains independent. No task permits editing another role's owned paths.

Codex has the largest investigation/integration scope; Antigravity builds medium-sized presentation components; Copilot implements bounded utility/test pairs. No token quota is changed by this allocation.

Full task definitions: `coordination/build-tasks.json`. Copyable role prompts: [Codex](prompts/codex.md), [Antigravity](prompts/antigravity.md), [Copilot](prompts/copilot.md). Mandatory summaries: [review protocol](reviews/README.md).
