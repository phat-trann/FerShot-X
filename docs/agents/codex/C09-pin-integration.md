# C09 restricted native pin integration

Status: PARTIAL. The explicit Pin image action is wired; timed post-capture preview and real native acceptance remain open.

Main-only open_pin canonicalizes bounded PNG bytes, validates source/name and constructs an always-on-top app URL window. No arbitrary URL/path/window label comes from JS. At most four windows and 64 MiB total encoded image text are retained. Each window retrieves/actions only its own server-side stored document using its injected label; main/unowned labels are refused. Closing/destroying releases backend state, build failures roll back reservations. Generic core capabilities remain main-only.

Pin page uses reviewed A05 controls for image scale/opacity, own-image clipboard copy, edit/focus main and close. Copy runs through the serialized native image job and bounded existing clipboard encoder. Main edit events restore source selection or a preserved raster if the original was closed. Large stored images are shared through Arc; blocking loading/copy work does not run on the UI thread. StrictMode/unmount handling revokes client object URLs, including late loads.

Image opacity is a CSS image effect inside an opaque native window, not verified whole-window desktop transparency. Window visibility/stacking/focus/clipboard behavior still require native manual acceptance. A15 floating post-capture preview is not wired by this checkpoint.

Actual checks: root Rust 14 tests passed, including caller ownership/count limit/request rejection; pin adapter 3 passed; initial pin-page 2 E2E and expanded root pin-request checks passed during the broader run. Broader run had 18 passes/one old ambiguous format selector; it was corrected and the targeted regression+pin rerun is recorded in the packet. Strict scoped App.tsx import-closure typecheck passed.

Full build at this checkpoint failed on worker A16 frozen-array vs tuple type errors. A16 received an actual changes_requested decision and exact source feedback; its code was not overwritten or excluded from builds. No native window was opened, clipboard accessed, screen captured or privacy setting changed during tests. Formatting/lint delegated to H01.
