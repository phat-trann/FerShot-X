# Start the implementation queues

Stack: **Tauri 2 + Rust + React/TypeScript**. The runnable foundation is present in this checkout. Open `/Users/phattran/Documents/Code/Personal/ferby-shottr/` locally in all three clients.

## Copy one prompt to each client

**Codex**

```text
Work in ferby-shottr. Read AGENTS.md and coordination/prompts/codex.md.
Execute its Queue dispatcher: C01-C05 with scoped claims, meaningful checks,
and a completion packet after every task/request. Review incoming packets
and integrate available approved modules. Skip blocked scopes without polling.
```

**Antigravity**

```text
Work in ferby-shottr. Read AGENTS.md and coordination/prompts/antigravity.md.
Execute its Queue dispatcher: A01-A05, one owned module at a time.
Use frozen props contracts without waiting for native wiring or editor state.
Submit each result to the common review inbox, release, then continue.
```

**GitHub Copilot**

```text
Work in ferby-shottr. Read AGENTS.md and coordination/prompts/copilot.md.
Execute P01-P05 in order, only the assigned small files and targeted tests.
Do not scan the whole repo or call REA. Submit a short completion packet
for each task/request, release your claim and continue without waiting.
```

## Sources of truth

- [Build queue and file ownership](BUILD-QUEUE.md).
- [Codex: five task prompts](prompts/codex.md).
- [Antigravity: five task prompts](prompts/antigravity.md).
- [Copilot: five task prompts](prompts/copilot.md).
- [Common completion/review inbox](reviews/README.md) and [generated index](reviews/INDEX.md).
- [Architecture and frozen contracts](../docs/implementation/ARCHITECTURE.md).

Each role file also has individual prompts if a single bounded request is preferred. Missing inputs/claims lead to another independent owned task, not a polling loop. C04 integrates available reviewed modules and can be partial; it must not fabricate readiness.

The original investigation prompts are preserved in [research-round1.md](prompts/research-round1.md). They are historical and their no-product-implementation instruction is superseded.

## Tooling

Node 26 is available through nvm, Rust stable/Cargo through `$HOME/.cargo/env`, and project-local npm dependencies are installed. No shared AI orchestrator is necessary. These files do not start another client automatically.

GitHub Copilot can implement its pure utility tasks from local files without another REA connection. Codex/Antigravity can reuse installed REA for focused target research if needed. macOS Screen Recording/Accessibility access for the REA host was denied during T02; installing Rust does not change those privacy permissions.
