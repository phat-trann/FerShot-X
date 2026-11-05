import { describe, expect, it, vi } from "vitest";
import { CaptureSessionController, type CaptureFrame, type DisplayGeometry } from ".";
const display: DisplayGeometry = { id: "synthetic", x: -100, y: 0, width: 100, height: 80, scale: 2 };
const budget = { maxFrames: 4, maxBytes: 1000, maxPixels: 100, overlap: 1 };
const frame = (value: number): CaptureFrame<number> => ({ value, width: 2, height: 2, byteSize: 16, release: vi.fn() });
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
describe("capture sessions", () => {
  it("orders frames, snapshots explicit geometry and transfers output ownership", async () => {
    const a = frame(1), b = frame(2); const output = { value: "png", release: vi.fn() };
    const stitch = vi.fn(async (frames: readonly CaptureFrame<number>[]) => { expect(frames.map(f => f.value)).toEqual([1, 2]); return output; });
    const acquire = vi.fn().mockResolvedValueOnce(a).mockResolvedValueOnce(b);
    const c = new CaptureSessionController({ acquire, stitch }, budget);
    c.start(display); await c.capture(); await c.capture();
    expect(await c.stop()).toBe(output); expect(await c.stop()).toBeNull();
    expect(stitch).toHaveBeenCalledTimes(1); expect(a.release).toHaveBeenCalledOnce(); expect(b.release).toHaveBeenCalledOnce();
    expect(output.release).not.toHaveBeenCalled(); expect(c.state.phase).toBe("done");
  });
  it("disposes a late acquisition after stop without stitching an empty session", async () => {
    const d = deferred<CaptureFrame<number>>(), a = frame(1), stitch = vi.fn();
    const c = new CaptureSessionController({ acquire: () => d.promise, stitch }, budget);
    c.start(display); const pending = c.capture(); expect(await c.stop()).toBeNull();
    d.resolve(a); expect(await pending).toBe(false); expect(a.release).toHaveBeenCalledOnce(); expect(stitch).not.toHaveBeenCalled();
  });
  it("isolates old stitch completion and retains frames until the adapter settles", async () => {
    const a = frame(1), d = deferred<{ value: string; release(): void }>(), output = { value: "old", release: vi.fn() };
    const c = new CaptureSessionController({ acquire: async () => a, stitch: () => d.promise }, budget);
    const first = c.start(display); await c.capture(); const stopped = c.stop();
    expect(c.start(display)).toBeGreaterThan(first); expect(a.release).not.toHaveBeenCalled();
    d.resolve(output); expect(await stopped).toBeNull(); expect(a.release).toHaveBeenCalledOnce(); expect(output.release).toHaveBeenCalledOnce();
    expect(c.state.phase).toBe("collecting");
  });
  it("rejects concurrent acquisition and drains every owned frame on budget failure", async () => {
    const a = frame(1), b = frame(2), d = deferred<CaptureFrame<number>>();
    const acquire = vi.fn().mockResolvedValueOnce(a).mockImplementationOnce(() => d.promise);
    const c = new CaptureSessionController({ acquire, stitch: vi.fn() }, { ...budget, maxFrames: 1 });
    c.start(display); await c.capture(); const pending = c.capture(); await expect(c.capture()).rejects.toThrow("pending");
    d.resolve(b); await expect(pending).rejects.toThrow("budget");
    expect(a.release).toHaveBeenCalledOnce(); expect(b.release).toHaveBeenCalledOnce(); expect(c.state.phase).toBe("failed");
  });
  it("invalidates repeat area permanently when any display geometry changes", () => {
    const c = new CaptureSessionController({ acquire: vi.fn(), stitch: vi.fn() }, budget);
    const area = { x: 1, y: 2, width: 30, height: 40 }; c.setRepeatArea(display, area); area.width = 99;
    expect(c.getRepeatArea(display)?.width).toBe(30);
    expect(c.getRepeatArea({ ...display, scale: 1 })).toBeNull(); expect(c.getRepeatArea(display)).toBeNull();
    expect(() => c.setRepeatArea(display, { x: 90, y: 0, width: 11, height: 1 })).toThrow();
  });
  it("cleans up stitch failures and allows a fresh explicit start", async () => {
    const a = frame(1); const c = new CaptureSessionController({ acquire: async () => a, stitch: async () => { throw new Error("stitch failed"); } }, budget);
    c.start(display); await c.capture(); await expect(c.stop()).rejects.toThrow("stitch failed"); expect(a.release).toHaveBeenCalledOnce();
    c.start(display); expect(c.state.phase).toBe("collecting");
  });
});
