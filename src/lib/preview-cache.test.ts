import { afterEach, describe, expect, it, vi } from "vitest";
import { createPreviewCache } from "./preview-cache";
import type { ImageDocument } from "../contracts/media";
const urls: string[] = [];
function image(): ImageDocument { const src = URL.createObjectURL(new Blob(["test"], { type: "image/png" })); urls.push(src); return { id: "a", name: "a.png", src, width: 2, height: 2, mimeType: "image/png", byteSize: 4 }; }
function own(value: ImageDocument) { urls.push(value.src); return value; }
afterEach(() => { urls.splice(0).forEach(url => URL.revokeObjectURL(url)); vi.restoreAllMocks(); });
describe("FTP preview cache", () => {
  it("reuses pixels with independently owned URLs and coalesces concurrent reads", async () => {
    const cache = createPreviewCache(), read = vi.fn(async () => image());
    const [a, b] = (await Promise.all([cache.load("a", read), cache.load("a", read)])).map(own);
    expect(read).toHaveBeenCalledTimes(1); expect(a.src).not.toBe(b.src);
    URL.revokeObjectURL(a.src); expect(await (await fetch(b.src)).text()).toBe("test");
    const again = own(cache.get("a")!); expect(await (await fetch(again.src)).text()).toBe("test"); cache.clear();
    expect(await (await fetch(b.src)).text()).toBe("test");
  });
  it("evicts least-recently-used entries and budgets decoded plus encoded bytes", async () => {
    const cache = createPreviewCache({ maxEntries: 2, maxBytes: 40 });
    own(await cache.load("a", async () => image())); own(await cache.load("b", async () => image()));
    own(cache.get("a")!); own(await cache.load("c", async () => image()));
    expect(cache.get("b")).toBeNull(); own(cache.get("a")!);
    const tiny = createPreviewCache({ maxBytes: 19 }); own(await tiny.load("large", async () => image())); expect(tiny.get("large")).toBeNull();
  });
  it("expires cached pixels and prunes removed queue items", async () => {
    let now = 100; vi.spyOn(Date, "now").mockImplementation(() => now);
    const cache = createPreviewCache({ ttl: 10 }); own(await cache.load("a", async () => image())); now += 10; expect(cache.get("a")).toBeNull();
    own(await cache.load("b", async () => image())); cache.retain(new Set()); expect(cache.get("b")).toBeNull();
  });
  it("does not repopulate after invalidation while a read is pending", async () => {
    const cache = createPreviewCache(); let resolve!: (doc: ImageDocument) => void;
    const pending = cache.load("a", () => new Promise(done => { resolve = done; })); await Promise.resolve();
    cache.clear(); resolve(image()); own(await pending); expect(cache.get("a")).toBeNull();
  });
  it("releases failed requests and permits retry", async () => {
    const cache = createPreviewCache(), read = vi.fn().mockRejectedValueOnce(new Error("401")).mockImplementationOnce(async () => image());
    await expect(cache.load("a", read)).rejects.toThrow("401"); own(await cache.load("a", read)); expect(read).toHaveBeenCalledTimes(2);
  });
});
