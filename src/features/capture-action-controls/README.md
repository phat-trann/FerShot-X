# Capture Action Controls

This controlled UI component exports `CaptureActionControls` providing interactive trigger buttons for the complete set of capture actions:
- `fullscreen`: Capture primary display.
- `area`: Custom region capture.
- `window`: Application window capture.
- `active-window`: Currently active foreground window (gated by `activeWindowSupported`).
- `fixed-region`: Predefined aspect/size region (gated by `fixedRegionSupported`).
- `repeat-region`: Re-capture previous region (gated by `fixedRegionSupported`).
- `scrolling`: Long content capture.
- `ocr`: Screen text and QR recognition.

Unsupported actions and globally disabled states disable corresponding buttons and prevent callback dispatches. No native screen capture APIs or global event listeners are invoked here. Root C26 consumes this component.

