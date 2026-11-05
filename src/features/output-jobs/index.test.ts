import { describe, expect, it, vi } from "vitest";
import { OutputCoordinator, type OutputRequest, type OutputArtifact } from ".";
const source = { id: "image", revision: 1, name: "image.png", src: "blob:synthetic", width: 2, height: 2, byteSize: 16, mimeType: "image/png" };
const request = (id = "intent"): OutputRequest => ({ id, source, options: { format: "jpeg", quality: 73, name: "result" }, actions: ["copy", "save"] });
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const artifact = (): OutputArtifact<string> => ({ value: "pixels", release: vi.fn() });
describe("output jobs", () => {
  it("deduplicates pending/completed intents and snapshots source/options before async work", async () => {
    const a = artifact(), render = vi.fn(async (_request: OutputRequest, _signal: AbortSignal) => a), copy = vi.fn(async () => ({ status: "completed" as const })), save = vi.fn(async () => ({ status: "completed" as const }));
    const c = new OutputCoordinator({ render, handlers: { copy, save } }); c.select(source);
    const mutable = { ...request(), options: { ...request().options } }; const p = c.run(mutable), duplicate = c.run(mutable); mutable.options.quality = 1;
    expect(await p).toEqual(await duplicate); expect((await c.run(request())).status).toBe("done");
    expect(render).toHaveBeenCalledOnce(); expect(copy).toHaveBeenCalledOnce(); expect(save).toHaveBeenCalledOnce(); expect(a.release).toHaveBeenCalledOnce();
    expect(render.mock.calls[0]?.[0]).toMatchObject({ source, options: { quality: 73, name: "result.jpg" } }); expect(source.revision).toBe(1);
  });
  it("retries a guaranteed not-performed failure without repeating completed copy", async () => {
    const all: OutputArtifact<string>[] = []; const render = vi.fn(async () => { const a = artifact(); all.push(a); return a; });
    const copy = vi.fn(async () => ({ status: "completed" as const }));
    const save = vi.fn().mockResolvedValueOnce({ status: "not-performed", error: "disk full" }).mockResolvedValueOnce({ status: "completed" });
    const c = new OutputCoordinator({ render, handlers: { copy, save } }); c.select(source);
    expect(await c.run(request())).toMatchObject({ status: "partial", completed: ["copy"] });
    expect((await c.run(request())).status).toBe("done"); expect(copy).toHaveBeenCalledOnce(); expect(save).toHaveBeenCalledTimes(2);
    all.forEach(a => expect(a.release).toHaveBeenCalledOnce());
  });
  it("does not retry an ambiguous external failure until explicitly reconciled", async () => {
    const copy = vi.fn().mockRejectedValue(new Error("connection lost after write")), save = vi.fn(async () => ({ status: "completed" as const }));
    const c = new OutputCoordinator({ render: async () => artifact(), handlers: { copy, save } }); c.select(source);
    expect((await c.run(request())).status).toBe("uncertain"); await c.run(request()); expect(copy).toHaveBeenCalledOnce();
    c.reconcile("intent", true); expect((await c.run(request())).status).toBe("done"); expect(copy).toHaveBeenCalledOnce(); expect(save).toHaveBeenCalledOnce();
  });
  it("disposes a stale render without dispatching actions for the newly selected image", async () => {
    const d = deferred<OutputArtifact<string>>(), a = artifact(), copy = vi.fn(), save = vi.fn();
    const c = new OutputCoordinator({ render: () => d.promise, handlers: { copy, save } }); c.select(source);
    const pending = c.run(request()); await Promise.resolve(); c.select({ id: "other", revision: 1 }); d.resolve(a);
    expect((await pending).status).toBe("stale"); expect(a.release).toHaveBeenCalledOnce(); expect(copy).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
  });
  it("keeps concurrency occupied until a cancelled render settles and never starts print/drag", async () => {
    const d = deferred<OutputArtifact<string>>(), print = vi.fn(), drag = vi.fn(), a = artifact();
    const c = new OutputCoordinator({ render: () => d.promise, handlers: { print, drag } }); c.select(source);
    const req = { ...request(), actions: ["print", "drag"] as const }; const pending = c.run(req); await Promise.resolve(); c.cancel();
    expect(() => c.run({ ...req, id: "second" })).toThrow("pending"); d.resolve(a);
    expect((await pending).status).toBe("cancelled"); expect(print).not.toHaveBeenCalled(); expect(drag).not.toHaveBeenCalled(); expect(a.release).toHaveBeenCalledOnce();
  });
  it("reports cleanup failure without repeating a completed effect", async () => {
    const copy = vi.fn(async () => ({ status: "completed" as const }));
    const c = new OutputCoordinator({ render: async () => ({ value: "pixels", release: () => { throw new Error("cleanup"); } }), handlers: { copy } }); c.select(source);
    const req = { ...request(), actions: ["copy"] as const }; expect(await c.run(req)).toMatchObject({ status: "done", cleanupFailed: true });
    await c.run(req); expect(copy).toHaveBeenCalledOnce();
  });
  it("rejects reusing an intent ID for another source revision and unsupported effects", async () => {
    const c = new OutputCoordinator({ render: async () => artifact(), handlers: { copy: async () => ({ status: "completed" }) } }); c.select(source);
    const req = { ...request(), actions: ["copy"] as const }; await c.run(req);
    expect(() => c.run({ ...req, source: { ...source, revision: 2 } })).toThrow("immutable");
    expect(() => c.run({ ...request("save") })).toThrow("capability");
  });
});
