# ferby-shottr

Local, evidence-based investigation of the installed Shottr application. Phase 1 inventories features; it does not implement a replacement application.

Target observed on 2026-11-05 (Asia/Ho_Chi_Minh): `/Applications/Shottr.app`, version **1.9.3**, build **137**, bundle ID `cc.ffitch.shottr`.

## Read first

- [Phase 1 feature analysis](docs/phase-1-features.md): feature map, supporting observations and remaining questions.
- [Interface Builder inventory](docs/ui-inventory.md): archived labels and action selectors grouped by resource.
- [Agent instructions](AGENTS.md): investigation rules and file ownership.
- [Coordination board](coordination/BOARD.md): work items and handoff locations.
- [Agent kickoff prompts](coordination/START-HERE.md): how to continue with Codex and Antigravity.

## Evidence

REA 6.8.0 ran `inspect-plist`, `decode-interface-builder`, and `inspect-macho` against the installed app. All three completed successfully. Collection was static: Shottr was not launched or manipulated, and no user screenshot library, preferences, clipboard, credentials or keychain was read.

- `evidence/target.json`: target version, executable SHA-256 and collection commands.
- `evidence/ui-signals.json`: selected REA observations with resource hashes, object IDs and original limitations.
- `evidence/native-summary.json`: native architecture, dependencies and REA identity.
- `evidence/raw/`: complete local REA JSON and stderr; ignored by Git. These files remain available to both agents on this machine. Curated summaries are projections, not substitutes for complete Evidence when a consumer requires it.

The resource graph reports partial connection coverage in eight documents and partial hierarchy coverage in one document. Resource evidence has a null executable identity; the separately collected executable digest does not retroactively authenticate the resource observation. Static UI declarations do not prove runtime availability, correctness, licensing or behavior.

## Reproduce

Run commands from this repository. Python 3.11+ and a supported Node runtime are required. The collector defaults to the already installed Node 26.13.0 and pins REA 6.8.0. Its `npx` invocation can acquire that package in npm's cache.

```sh
rtk proxy python3 scripts/collect_initial_evidence.py
rtk proxy python3 scripts/summarize_evidence.py
```

For a different app location or Node installation:

```sh
rtk proxy python3 scripts/collect_initial_evidence.py --app /Applications/Shottr.app --node-bin /absolute/path/to/node/bin
```

Recollection replaces the generated evidence files. Preserve a prior run separately before a version comparison. The summarizer needs the collector's raw JSON files.

Git is initialized on branch `main`. No remote or initial commit has been created. `.vscode/`, app copies, raw analysis output, captures, caches, secrets and common build artifacts are ignored.
