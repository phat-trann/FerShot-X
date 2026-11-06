# Manual scroll workspace

`ScrollWorkspace` is a controlled manual frame-collection surface. The user
scrolls the source and explicitly captures each frame; it does not schedule
screenshots, expose a non-functional speed control, or register native
commands. Start, capture, stop/stitch and cancel are caller-owned seams for
the C11 capture-session integration.

Configuration is limited to output height and direction. Existing scroll
height limits are reused from `ScrollCapturePanel`. Original scrolling
behavior remains unknown, and native acquisition/output are not implemented
by this component.
