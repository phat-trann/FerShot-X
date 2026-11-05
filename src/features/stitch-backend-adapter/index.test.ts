import { describe, expect, it, vi } from "vitest";
import { CaptureSessionController, type CaptureFrame } from "../capture-session";
import { createStitchBackendAdapter, type RgbaImage, type StitchAdapterOptions, type StitchAdapterPorts, type StitchOutputLease } from "./index";

function frame(rows = [1, 2, 3]): CaptureFrame<RgbaImage> {
  const rgba = new Uint8Array(rows.flatMap(v => [v, v, v, 255]));
  return { width: 1, height: rows.length, byteSize: rgba.length, value: { width: 1, height: rows.length, rgba }, release: vi.fn() };
}
function output() {
  return { width: 1, height: 4, rgba: new Uint8Array(16), matchedOverlaps: [2], skippedDuplicates: 0 };
}
function fixture(options: StitchAdapterOptions = {}) {
  const release = vi.fn();
  const ports = {
    acquire: vi.fn<StitchAdapterPorts["acquire"]>(async () => frame()),
    stitch: vi.fn<StitchAdapterPorts["stitch"]>(async () => ({ value: output(), release })),
  };
  return { ports, release, adapter: createStitchBackendAdapter(ports, options) };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}
const signal = () => new AbortController().signal;

describe("C24 injected stitch adapter", () => {
  it("copies source/output pixels and transfers an output lease with exactly-once release", async () => {
    const f = fixture({ direction: "up", maxChannelDiff: 3 });
    const inputs = [frame(), frame([2, 3, 4])], native = output();
    f.ports.stitch.mockResolvedValue({ value: native, release: f.release });
    const artifact = await f.adapter.stitch(inputs, signal());
    const request = f.ports.stitch.mock.calls[0][0];
    expect(request.options).toMatchObject({ direction: "up", minOverlapRows: 2, maxChannelDiff: 3 });
    request.frames[0].rgba[0] = 200;
    expect(inputs[0].value.rgba[0]).toBe(1);
    native.rgba[0] = 99;
    expect(artifact.value.rgba[0]).toBe(0);
    expect(f.release).not.toHaveBeenCalled();
    artifact.release(); artifact.release();
    expect(f.release).toHaveBeenCalledTimes(1);
    expect(inputs[0].release).not.toHaveBeenCalled();
  });

  it("works with C17 and leaves input cleanup to the capture controller", async () => {
    const f = fixture(), a = frame(), b = frame([2, 3, 4]);
    f.ports.acquire.mockResolvedValueOnce(a).mockResolvedValueOnce(b);
    const controller = new CaptureSessionController(f.adapter, { maxFrames: 4, maxBytes: 100, maxPixels: 100, overlap: 2 });
    controller.start({ id: "display", x: 0, y: 0, width: 10, height: 10, scale: 1 });
    await controller.capture(); await controller.capture();
    const artifact = await controller.stop();
    expect(artifact?.value.height).toBe(4);
    expect(a.release).toHaveBeenCalledTimes(1);
    expect(b.release).toHaveBeenCalledTimes(1);
    artifact?.release();
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["empty", () => []],
    ["too many", () => Array.from({ length: 65 }, () => frame())],
    ["malformed bytes", () => [{ ...frame(), value: { ...frame().value, rgba: new Uint8Array(11) } }]],
    ["metadata mismatch", () => [{ ...frame(), byteSize: 13 }]],
    ["width mismatch", () => [frame(), { ...frame(), width: 2 }]],
    ["height mismatch", () => [frame(), frame([1, 2, 3, 4])]],
    ["reused lease", () => { const same = frame(); return [same, same]; }],
  ] as const)("rejects %s before transport without releasing caller frames", async (_name, makeFrames) => {
    const f = fixture();
    await expect(f.adapter.stitch(makeFrames(), signal())).rejects.toThrow();
    expect(f.ports.stitch).not.toHaveBeenCalled();
  });

  it.each([{ maxInputBytes: 20 }, { maxInputPixels: 5 }])("rejects aggregate input budget before dispatch", async options => {
    const f = fixture(options);
    await expect(f.adapter.stitch([frame(), frame()], signal())).rejects.toThrow(/budget/);
    expect(f.ports.stitch).not.toHaveBeenCalled();
  });

  it.each([
    { ...output(), width: 2 }, { ...output(), height: 5 },
    { ...output(), rgba: new Uint8Array(15) },
    { ...output(), matchedOverlaps: [1] }, { ...output(), skippedDuplicates: 2 },
    { ...output(), matchedOverlaps: [] },
  ])("releases malformed transport output once", async invalid => {
    const f = fixture(); f.ports.stitch.mockResolvedValue({ value: invalid, release: f.release });
    await expect(f.adapter.stitch([frame(), frame()], signal())).rejects.toThrow();
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it("accepts duplicate-frame metadata without inventing an overlap", async () => {
    const f = fixture();
    f.ports.stitch.mockResolvedValue({ value: { width: 1, height: 3, rgba: new Uint8Array(12), matchedOverlaps: [], skippedDuplicates: 1 }, release: f.release });
    const artifact = await f.adapter.stitch([frame(), frame()], signal());
    expect(artifact.value.height).toBe(3); artifact.release();
  });

  it("rejects excessive output bytes even if all input frames fit", async () => {
    const f = fixture({ maxOutputBytes: 14 });
    await expect(f.adapter.stitch([frame(), frame()], signal())).rejects.toThrow(/budget/);
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it("makes no port call when already aborted", async () => {
    const f = fixture(), abort = new AbortController(); abort.abort();
    await expect(f.adapter.stitch([frame()], abort.signal)).rejects.toMatchObject({ name: "AbortError" });
    await expect(f.adapter.acquire({ id: "d", x: 0, y: 0, width: 1, height: 1, scale: 1 }, abort.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(f.ports.acquire).not.toHaveBeenCalled(); expect(f.ports.stitch).not.toHaveBeenCalled();
  });

  it("releases a late output after cancellation and never returns it", async () => {
    const f = fixture(), pending = deferred<StitchOutputLease>(), abort = new AbortController();
    f.ports.stitch.mockReturnValue(pending.promise);
    const run = f.adapter.stitch([frame(), frame()], abort.signal);
    abort.abort(); pending.resolve({ value: output(), release: f.release });
    await expect(run).rejects.toMatchObject({ name: "AbortError" });
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it("never retries a throwing resource release", async () => {
    const f = fixture(); f.release.mockImplementation(() => { throw new Error("cleanup failed"); });
    const artifact = await f.adapter.stitch([frame(), frame()], signal());
    expect(() => artifact.release()).toThrow("cleanup failed");
    expect(() => artifact.release()).not.toThrow();
    expect(f.release).toHaveBeenCalledTimes(1);
  });

  it.each([{ minOverlapRows: 1 }, { maxChannelDiff: 256 }, { maxOutputHeight: 32769 }, { maxInputBytes: Number.NaN }])("rejects invalid options before using ports", options => {
    expect(() => fixture(options)).toThrow(/options/);
  });
});
