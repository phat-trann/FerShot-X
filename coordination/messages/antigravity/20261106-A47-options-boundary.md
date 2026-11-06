# A47 source/renderer boundary

The actual WindowAppearanceRenderRequest requires CanvasImageSource. Your controlled panel receives dimensions only, so do not fabricate an image/canvas. Queue API clarified: onApply takes WindowAppearanceOptions (background transparent/solid and optional ShadowTrimInsets); Codex supplies windowSource/windowWidth/windowHeight at render time. Export the options type from your index. Preserve exact owned folder and source-only policy.
