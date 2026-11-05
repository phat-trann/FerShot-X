// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importImage } from "./import-image";
import { MAX_IMPORTED_BYTES } from "./image-limits";

const create = vi.fn(() => "blob:synthetic"), revoke = vi.fn();
let dimensions = { width: 2, height: 2 };
let decodeFails = false;
beforeEach(() => {
  dimensions = { width: 2, height: 2 }; decodeFails = false;
  create.mockClear(); revoke.mockClear();
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
  vi.stubGlobal("crypto", { randomUUID: () => "synthetic-id" });
  vi.stubGlobal("Image", class {
    src = "";
    get naturalWidth() { return dimensions.width; }
    get naturalHeight() { return dimensions.height; }
    async decode() { if (decodeFails) throw new Error("fake decoder rejected"); }
  });
});
afterEach(() => vi.unstubAllGlobals());
const file = () => new File(["synthetic bytes"], "image.png", { type: "image/png" });

describe("image import resource ownership", () => {
  it("rejects type/size before allocating a URL", async () => {
    await expect(importImage(new File(["text"], "x.txt", { type: "text/plain" }))).rejects.toThrow("PNG");
    const large = file(); Object.defineProperty(large, "size", { value: MAX_IMPORTED_BYTES + 1 });
    await expect(importImage(large)).rejects.toThrow("20 MB");
    expect(create).not.toHaveBeenCalled();
  });
  it("revokes a URL when the decoder fails", async () => {
    decodeFails = true;
    await expect(importImage(file())).rejects.toThrow("could not be opened");
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:synthetic");
  });
  it("rejects excessive decoded dimensions and cleans up with a useful error", async () => {
    dimensions = { width: 8192, height: 8192 };
    await expect(importImage(file())).rejects.toThrow("16 megapixels");
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:synthetic");
  });
  it("transfers a successful URL to the session owner", async () => {
    const result = await importImage(file());
    expect(result).toMatchObject({ id: "synthetic-id", src: "blob:synthetic", width: 2, height: 2 });
    expect(revoke).not.toHaveBeenCalled();
  });
});
