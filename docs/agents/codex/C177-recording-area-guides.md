# C177 — Record Area guide placement and exclusion

Area guides previously appeared after shareable-content/filter creation, allowing an empty own-app exclusion to omit subsequently displayed guides. Guides now appear before discovery; hidden windows participate and window ownership supplies a PID fallback. Visible guides require a resolved app exclusion before recording. Exact borderless frames are reapplied and checked after ordering onscreen, rejecting shifted top bands. Crop/pointer coordinates and output sizing remain unchanged.

Validation: native compilation and all 25 recording tests passed, including generated-media export, full per-pixel guide coverage on Retina/displaced displays, shifted-frame rejection and exclusion policy. No live screen/audio/input/server/permission actions, bundle/version bump or publication. Installed geometry and guide-free recording require retest. USER_WAIVED_REVIEW only.

API contract: [Apple SCContentFilter](https://developer.apple.com/documentation/screencapturekit/sccontentfilter) excludes windows belonging to the supplied applications. Source-level coverage does not prove the installed failure's exact cause.
