# C25: Export handoff skipped on active worker claim

A proposed completed-export entrypoint repair was not executed. P70 was acquired by Copilot before Codex could acquire its producer claim, and the .tsx target already exists. The source move stopped before editing any worker source. Temporary dispatch handoff metadata was reverted. Codex releases only its own C25/P71 claims; P70 remains worker-owned. No product code or test change is claimed. The existing P70 correction stays with Copilot; P71 receives the analogous syntax correction. No tests are run for this skipped operation.
