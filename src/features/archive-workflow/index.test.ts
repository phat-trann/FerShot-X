import { describe, expect, it, vi } from "vitest";
import { ArchiveWorkflow, type ArchiveAdapters, type ArchiveLibrary, type DecodedArchive, type ArchiveImageLease } from ".";
const image = { id: "a", name: "a.png", src: "blob:old", width: 2, height: 2, byteSize: 4, mimeType: "image/png" };
const library = (): ArchiveLibrary => ({ revision: 7, images: [{ ...image }], selectedId: "a", annotations: { a: [{ text: "keep" }] } });
const archive = (): DecodedArchive => ({ entries: [{ id: "a", name: "new.png", width: 2, height: 2, mimeType: "image/png", bytes: new Uint8Array([1, 2, 3, 4]), annotations: [{ text: "new" }] }], selectedId: "a" });
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function adapters(): ArchiveAdapters {
  return { read: async () => new Uint8Array([1]), decode: async () => archive(), createImage: async () => ({ src: "blob:new", release: vi.fn() }),
    commit: vi.fn(() => true), readImage: async () => new Uint8Array([1, 2, 3, 4]), encode: async () => new Uint8Array([9]), write: async () => true };
}
describe("archive workflow", () => {
  it("stages immutable collision remapping while preserving selection and old annotations", async () => {
    const a = adapters(), release = vi.fn(); a.createImage = async () => ({ src: "blob:new", release });
    const original = library(), c = new ArchiveWorkflow(a); const result = await c.importInto(original);
    expect(result.status).toBe("committed"); expect(result.remap.a).toBe("a~import-1");
    expect(result.candidate).toMatchObject({ revision: 8, selectedId: "a", annotations: { a: [{ text: "keep" }], "a~import-1": [{ text: "new" }] } });
    expect(original.images).toHaveLength(1); expect(Object.isFrozen(result.candidate?.images[1])).toBe(true);
    expect(release).not.toHaveBeenCalled(); result.releaseImage("a"); expect(release).not.toHaveBeenCalled();
    result.releaseAll(); result.releaseAll(); expect(release).toHaveBeenCalledOnce();
  });
  it("rejects a mixed-validity archive atomically before any resources or commit", async () => {
    const a = adapters(); a.decode = async () => ({ entries: [...archive().entries, { ...archive().entries[0]!, id: "bad", width: 0 }], selectedId: "a" });
    a.createImage = vi.fn(); const original = library(); await expect(new ArchiveWorkflow(a).importInto(original)).rejects.toThrow("metadata");
    expect(a.createImage).not.toHaveBeenCalled(); expect(a.commit).not.toHaveBeenCalled(); expect(original.selectedId).toBe("a");
  });
  it("rejects aliased image leases and releases the shared resource only once", async () => {
    const a = adapters(), lease = { src: "blob:shared", release: vi.fn() };
    a.decode = async () => ({ entries: [archive().entries[0]!, { ...archive().entries[0]!, id: "b" }], selectedId: "a" });
    a.createImage = async () => lease;
    await expect(new ArchiveWorkflow(a).importInto(library())).rejects.toThrow("reused");
    expect(lease.release).toHaveBeenCalledOnce(); expect(a.commit).not.toHaveBeenCalled();
  });
  it("cleans previously staged resources when later creation fails", async () => {
    const a = adapters(), release = vi.fn();
    a.decode = async () => ({ entries: [archive().entries[0]!, { ...archive().entries[0]!, id: "b" }], selectedId: "a" });
    a.createImage = vi.fn().mockResolvedValueOnce({ src: "blob:new", release }).mockRejectedValueOnce(new Error("decode image"));
    await expect(new ArchiveWorkflow(a).importInto(library())).rejects.toThrow("decode image"); expect(release).toHaveBeenCalledOnce(); expect(a.commit).not.toHaveBeenCalled();
  });
  it("discards a late decoder result after cancellation without creating URLs", async () => {
    const a = adapters(), d = deferred<DecodedArchive>(); a.decode = () => d.promise; a.createImage = vi.fn();
    const c = new ArchiveWorkflow(a), pending = c.importInto(library()); await Promise.resolve(); c.cancel(); d.resolve(archive());
    expect((await pending).status).toBe("cancelled"); expect(a.createImage).not.toHaveBeenCalled(); expect(a.commit).not.toHaveBeenCalled();
  });
  it("releases a late image lease after cancellation and rejects revision conflicts", async () => {
    const a = adapters(), d = deferred<ArchiveImageLease>(), release = vi.fn(); a.createImage = () => d.promise;
    const c = new ArchiveWorkflow(a), pending = c.importInto(library()); await Promise.resolve(); await Promise.resolve(); c.cancel();
    d.resolve({ src: "blob:late", release }); expect((await pending).status).toBe("cancelled"); expect(release).toHaveBeenCalledOnce();
    const b = adapters(), otherRelease = vi.fn(); b.commit = vi.fn(() => false); b.createImage = async () => ({ src: "blob:staged", release: otherRelease });
    expect((await new ArchiveWorkflow(b).importInto(library())).status).toBe("conflict"); expect(otherRelease).toHaveBeenCalledOnce();
  });
  it("exports actual owned bytes, never image URL content, from a frozen annotation snapshot", async () => {
    const a = adapters(), d = deferred<Uint8Array>(); a.readImage = () => d.promise;
    a.encode = vi.fn(async (data: DecodedArchive) => { expect(data.entries[0]).not.toHaveProperty("src"); expect(data.entries[0]?.bytes).toEqual(new Uint8Array([4]));
      expect(data.entries[0]?.annotations).toEqual([{ text: "keep" }]); return new Uint8Array([9]); });
    const input = { ...library(), annotations: { a: [{ text: "keep" }] } }, c = new ArchiveWorkflow(a), pending = c.exportFrom(input);
    input.annotations.a[0]!.text = "mutated"; d.resolve(new Uint8Array([4])); expect(await pending).toBe("saved"); expect(input.images[0]?.src).toBe("blob:old");
  });
  it("never writes when export is cancelled and keeps the single operation slot until settlement", async () => {
    const a = adapters(), d = deferred<Uint8Array>(); a.readImage = () => d.promise; a.write = vi.fn();
    const c = new ArchiveWorkflow(a), pending = c.exportFrom(library()); c.cancel();
    await expect(c.importInto(library())).rejects.toThrow("pending"); d.resolve(new Uint8Array([1])); expect(await pending).toBe("cancelled"); expect(a.write).not.toHaveBeenCalled();
  });
});
