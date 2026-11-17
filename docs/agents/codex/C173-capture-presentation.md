# C173 — Hidden Capture Area presentation

The renderer previously required new canvas pixels before showing Edit. A hidden WKWebView can defer decode/painting, creating a circular wait. The new document must now commit its fresh canvas and finish sizing; ready pixels still present immediately. Hidden views may present a loading canvas, while visible views retain a 250ms decode grace. The icon-only overlay hides on ready/error. Timers clear on replacement, capture start, close, video handoff and unmount.

Validation: TypeScript and 8 injected browser cases passed, including withheld image loading, hidden/visible presentation, no old pixels, normal fast painting, close/new-capture cancellation, Escape and immediate upload. No native code/build/bundle, real capture/server/permissions, version bump or publication. This reproduces a source-level liveness failure, not proof of the installed intermittent cause. USER_WAIVED_REVIEW only.

Manual: repeatedly Capture Area from hidden Edit/Library across displays; each selection should open the latest image after one shortcut, without an old-image flash.
