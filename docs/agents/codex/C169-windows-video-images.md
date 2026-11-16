# C169 — Windows and video images

Library resets to 75% of the active display work area; Video Edit uses 80%; Image Edit retains image-dependent sizing. All views center on opening. Settings is fixed at 532×637 logical pixels. Library receives the missing titlebar maximize permission. Mixed-DPI placement and small-display constraints remain bounded.

The compact timeline initially scrolls to the bottom. Video Add Image reuses file/capture actions and inserts a separate timed Image layer, preserving the current video. Bounded PNG artwork persists in drafts and appears in Edit, Library and native exports, with ordinary layer manipulation/undo.

Validation: TypeScript, 24 injected browser cases, recording unit/native generated-media checks and window geometry tests. No live capture/server/permissions, bundle, version bump or publication. Installed window/titlebar/capture behavior remains manual acceptance. USER_WAIVED_REVIEW only.
