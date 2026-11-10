# Injected RGBA stitching adapter (C24)

`createStitchBackendAdapter(ports, options?)` implements `CaptureSessionAdapters<RgbaImage, RgbaImage>`. `RgbaImage` contains `width`, `height`, and `rgba: Uint8Array`. The caller injects `acquire(display, signal)` and `stitch(request, signal)`; no screen capture, scrolling, native command or alternate stitch algorithm exists here.

Each capture frame's dimensions and byteSize must exactly describe its RGBA value. Following C17, all frames have the same dimensions. Following A22, batches contain 1–64 frames with dimensions up to 8192, minimum height 2 and overlap at least 2. Defaults: downward stitching, overlap 2, output height 8192, channel tolerance 0. Input and output budgets each default to 64 MiB and 16,777,216 pixels; options may lower them. Output height can be at most 32768. These bounds are the intersection of C17/A22 constraints, not recovered reference application behavior.

The local request is `{frames, options}` with copied typed RGBA buffers and camelCase options. The stitch port returns `{value, release()}`, where unknown `value` must contain `width`, `height`, `rgba: Uint8Array`, `matchedOverlaps: number[]`, and `skippedDuplicates`. Metadata must agree with returned height. A22 currently has no serde/registered command: future **C11 root wiring must implement serialization, native errors, permissions and blocking-worker dispatch**. This port is a proposal, not a claim about an existing IPC API.

C17 owns input frames and releases them when a pending stitch settles, including after cancellation. The adapter never releases caller-owned inputs. Valid output leases release once on abort or malformed output; on success the returned artifact owns that release and repeated calls are harmless, even if release throws. Output pixels are copied so caller mutation cannot alter port-owned pixels. Ports must settle their promises; abort cannot preempt synchronous native work or force a hung port to release an output it has not returned. Direct callers of `acquire` must assume frame ownership; C17 handles late acquisition cleanup.

```ts
const adapters = createStitchBackendAdapter({ acquire: injectedCapture, stitch: injectedStitch });
const controller = new CaptureSessionController(adapters, explicitCaptureBudget);
// User explicitly starts a session, captures frames, then finishes or cancels.
```

Synthetic tests verify the adapter contract only. Native scrolling, capture permissions, pixel matching and original parity remain separate acceptance work.
