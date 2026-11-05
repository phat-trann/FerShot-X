import { describe, expect, it } from "vitest";
import {
  ArchiveWorkflow,
  type ArchiveAdapters,
  type ArchiveLibrary,
} from "../features/archive-workflow";

const library: ArchiveLibrary = {
  revision: 4,
  images: [{
    id: "original",
    name: "original",
    src: "blob:original",
    width: 10,
    height: 10,
    mimeType: "image/png",
    byteSize: 400,
  }],
  selectedId: "original",
  annotations: { original: { note: "keep" } },
};

function entry(id = "imported") {
  return {
    id,
    name: "imported",
    width: 2,
    height: 2,
    mimeType: "image/png",
    bytes: new Uint8Array([1, 2, 3, 4]),
    annotations: { imported: true },
  };
}

function adapters(overrides: Partial<ArchiveAdapters> = {}): ArchiveAdapters {
  return {
    read: async () => new Uint8Array([9]),
    decode: async () => ({ entries: [entry()], selectedId: "imported" }),
    createImage: async () => ({ src: "blob:imported", release: () => undefined }),
    commit: () => true,
    readImage: async () => new Uint8Array([1, 2, 3]),
    encode: async () => new Uint8Array([4]),
    write: async () => true,
    ...overrides,
  };
}

describe("ArchiveWorkflow public invariants", () => {
  it("releases staged leases when import is cancelled", async () => {
    let releases = 0;
    let resolveDecode!: (value: { entries: ReturnType<typeof entry>[]; selectedId: string }) => void;
    const pending = new Promise<{ entries: ReturnType<typeof entry>[]; selectedId: string }>((resolve) => {
      resolveDecode = resolve;
    });
    const workflow = new ArchiveWorkflow(adapters({
      createImage: async () => ({
        src: "blob:imported",
        release: () => {
          releases += 1;
        },
      }),
      decode: async () => await pending,
    }));
    const importPromise = workflow.importInto(library);
    await Promise.resolve();
    workflow.cancel();
    resolveDecode({ entries: [entry()], selectedId: "imported" });
    const result = await importPromise;

    expect(result.status).toBe("cancelled");
    expect(releases).toBe(0);
  });

  it("releases staged leases when compare-and-swap reports a conflict", async () => {
    let releases = 0;
    const workflow = new ArchiveWorkflow(adapters({
      createImage: async () => ({
        src: "blob:imported",
        release: () => {
          releases += 1;
        },
      }),
      commit: () => false,
    }));

    const result = await workflow.importInto(library);

    expect(result.status).toBe("conflict");
    expect(result.candidate).toBeNull();
    expect(releases).toBe(1);
  });

  it("remaps duplicate IDs without mutating the original library", async () => {
    let committed: ArchiveLibrary | null = null;
    const workflow = new ArchiveWorkflow(adapters({
      decode: async () => ({ entries: [entry("original")], selectedId: "original" }),
      commit: (candidate) => {
        committed = candidate;
        return true;
      },
    }));

    const result = await workflow.importInto(library);

    expect(result.status).toBe("committed");
    expect(result.remap.original).toBe("original~import-1");
    expect(committed?.images).toHaveLength(2);
    expect(library.images).toHaveLength(1);
    expect(library.selectedId).toBe("original");
  });

  it("does not serialize source URLs during export", async () => {
    let encodedEntries: readonly ReturnType<typeof entry>[] = [];
    const workflow = new ArchiveWorkflow(adapters({
      encode: async (decoded) => {
        encodedEntries = decoded.entries;
        return new Uint8Array([4]);
      },
    }));

    await expect(workflow.exportFrom(library)).resolves.toBe("saved");
    expect(encodedEntries[0]).not.toHaveProperty("src");
    expect(encodedEntries[0].bytes).toEqual(new Uint8Array([1, 2, 3]));
  });
});
