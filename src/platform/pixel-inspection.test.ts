// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { inspectImagePixel } from "./pixel-inspection";
import type { ImageDocument } from "../contracts/media";
const decode = vi.fn();
const documentFixture: ImageDocument = { id: "synthetic", name: "fixture.png", src: "blob:synthetic", mimeType: "image/png", width: 2, height: 2, byteSize: 10 };
beforeEach(() => {
  decode.mockReset();
  vi.stubGlobal("Image", class { src = ""; naturalWidth = 2; naturalHeight = 2; decode = decode; });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("rejects impossible metadata and invalid pixel coordinates before decoding", async () => {
  await expect(inspectImagePixel({ ...documentFixture, width: 20000 }, { x: 0, y: 0 })).rejects.toThrow();
  for (const point of [{ x: -1, y: 0 }, { x: 2, y: 0 }, { x: 0.5, y: 0 }, { x: 0, y: NaN }]) {
    await expect(inspectImagePixel(documentFixture, point)).rejects.toThrow();
  }
  expect(decode).not.toHaveBeenCalled();
});
it("propagates decoder failure so the workspace can recover", async () => {
  decode.mockRejectedValue(new Error("synthetic decode failure"));
  await expect(inspectImagePixel(documentFixture, { x: 0, y: 0 })).rejects.toThrow("synthetic decode failure");
});
it("rejects mismatched decoded dimensions before pixel access", async () => {
  decode.mockResolvedValue(undefined);
  const canvas = vi.spyOn(document, "createElement");
  await expect(inspectImagePixel({ ...documentFixture, width: 3 }, { x: 0, y: 0 })).rejects.toThrow("dimensions changed");
  expect(canvas).not.toHaveBeenCalled();
});
