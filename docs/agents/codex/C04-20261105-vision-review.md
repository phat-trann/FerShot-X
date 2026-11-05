# C04: Current Vision core review and root handoff checkpoint

C04/root-wiring were explicitly handed off by the user after confirming the former session stopped; prior owner snapshots are in COORD13. Independent audit claims were preserved.

Inspected current A33 source, public serde/request/response contracts, pure validation and macOS Objective-C backend. Ran the named pure-validation unit test (1 passed; native runtime test filtered out) and P64 fake-backend integration tests (4 passed). No Vision runtime query/recognition or real OS action was executed.

Requested a functional correction: recognized_text joins blocks after accounting for block bytes but omits separators, so the final text can exceed MAX_UTF8_OUTPUT_BYTES. QR symbology strings are not budgeted either. Existing tests do not cover those cases. Codex will claim the free A33 producer scope under the user-authorized takeover, reproduce and fix without changing versions or minimum OS. The changed native core will require independent review before integration. Native acceptance and all final review gates remain open.

C23/C24 adapter tests pass; the initial ad hoc scoped tsc command required TypeScript 6 --ignoreConfig. The corrected command passed. Global application typecheck still fails in A37/P61 outside those adapters, so no application build pass was claimed. Formatting/lint delegated to Copilot H01.
