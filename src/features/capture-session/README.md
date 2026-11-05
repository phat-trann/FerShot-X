# C17 capture-session controller

Manual, user-triggered frame collection with injected acquisition/stitching. No OS work or autoscroll runs here. Frames must be immutable owned resources; each acquisition transfers ownership. Cleanup callbacks should be nonthrowing (cleanup failures are contained). A successful stop transfers its output to the caller. Cancelled/stale outputs are released; in-flight stitching retains its input frames until settlement. An adapter that never settles can retain those resources; AbortSignal is cooperative.

```ts
const session = new CaptureSessionController({ acquire: acquireSyntheticOrNativeFrame, stitch: stitchThroughReviewedA22 }, {
  maxFrames: 32, maxBytes: 64 * 1024 * 1024, maxPixels: 16_777_216, overlap: 20,
});
session.start(explicitDisplayGeometry); // user starts
await session.capture(); // explicit frame action or caller-owned scheduler
const result = await session.stop();
// Consume result.value; caller eventually calls result.release().
```

C11 must adapt the reviewed capture/stitch APIs, pass actual display geometry and preserve OS permission/cancellation results. Width/height are explicit image pixels; repeat areas are local display coordinates, not inferred Retina coordinates. Frames currently require identical dimensions and fixed overlap; aggregate input pixels and stitched output both respect the budget. No arbitrary-app scrolling compatibility or Shottr behavior is asserted. Formatting/lint belongs to Copilot H01; native integration requires independent Antigravity review.
