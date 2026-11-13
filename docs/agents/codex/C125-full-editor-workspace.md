# C125 Full Edit workspace

The image workspace now fills the available space beneath Edit chrome, with no outer/stage padding, border, rounding or fixed 16:9 viewport. Removed its dedicated width state/ResizeObserver. Native outer-window sizing remains unchanged.

Crop fitting no longer reserves space for an obsolete inline header. Source proportions, small-image 100% opening scale, Fit, pointer-centered zoom/pan, floating properties and bounded Konva drawing remain intact. Aspect-ratio differences can still leave canvas background around the bitmap; pixels are never stretched or cropped automatically.

Validation: TypeScript and seven injected browser regressions passed, covering full workspace geometry, wide/tall Fit, unchanged dimensions when properties appear, crop Enter/Escape, pointer zoom anchoring and touchpad/pinch. Wide/tall screenshots inspected. No build, real OS/server operations, commit or push; user acceptance pending.
