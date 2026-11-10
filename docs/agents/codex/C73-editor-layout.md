# C73 editor layout and elements

The image viewport stays 16:9; properties float without changing viewport bounds or Fit. Native Edit no longer enforces an outer-window aspect ratio. Edit/Library show routing hides the other view, with rollback. All three screens show the app title. Prepared-PNG drag UI was archived and removed. Borderless toolbar groups have separators and title-cased hover labels.

Konva offers eight resize anchors, center dragging and rotation. Resizing retains stroke settings; text/counter geometry scaling is separate. Rotation persists in drafts and raster export. Blur is an editable element, with no destructive image command or Enter requirement. Export includes blurred pixels. Local double-click opens Edit; FTP double-click invokes a scoped browser action using the stored HTTPS URL.

Checks: 412 unit tests, 24 distinct browser cases, no-emit typecheck/version guard. Native compilation/build NOT RUN by user instruction. Other prior acceptance is USER_REPORTED: 55% → 85%. C73 native retest/release remain open.
