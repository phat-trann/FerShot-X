# C119 Local Blur recovery

The user reports missing Blur artwork in Edit after reopening Local history. Ordinary draft reopening retained blurred pixels in the browser. Injecting offscreen raster loss reproduced a recovery gap: resetting visible canvases left the cached Blur transparent.

Foreground recovery now invalidates Blur's sampled cache, rebuilding from the decoded original. Zoom/pan and bounded recovery paints reuse it. Editable geometry/strength, originals, draft persistence and export remain intact.

Validation: TypeScript and four focused browser cases passed. The new regression compares real pixels before/after reopening and injected cache loss, then checks strength editing and exported pixels. Native operations use fakes; the installed WKWebView failure's cause remains unproven and requires a user retest. No build, commit or push.
