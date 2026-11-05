# A22: First-frame pixel budget

Under the user-authorized Antigravity producer takeover, Codex added cheap pixel-count validation to frame geometry before RGBA length checks/allocation. A single frame can no longer bypass MAX_OUTPUT_PIXELS simply because no later frame is appended. A metadata-only regression uses an empty byte vector for over-limit dimensions; the exact pixel-cap case still reaches the normal malformed-RGBA check. No large image/buffer was allocated by these tests.

Before the fix the new target had one failing over-budget regression and one passing exact-cap regression. Final functional results are in the packet. No OS capture/scroll, dependency/version, public API or minimum OS change occurred. The lower C17/C24 adapter limits remain unchanged. Native integration and independent review of this new Codex-owned snapshot remain pending. Formatting/lint delegated to Copilot H01.
