import { afterEach, beforeEach, expect, it, vi } from "vitest";
const renderer = vi.hoisted(() => vi.fn());
vi.mock("../features/editor/render", () => ({ renderAnnotationsToPngBlob: renderer }));
import { withAnnotations, renderAnnotatedDocument } from "./annotations";
import type { ImageDocument } from "../contracts/media";
import type { Annotation } from "../contracts/editor";
const document: ImageDocument = { id: "source", name: "original.png", src: "blob:original", width: 2, height: 2, byteSize: 8, mimeType: "image/png" };
const annotation: Annotation = { id: "rect", tool: "rectangle", points: [{ x: 0, y: 0 }, { x: 2, y: 2 }], style: { color: "#ef4444", strokeWidth: 1, opacity: 1 } };
beforeEach(() => { renderer.mockReset(); renderer.mockResolvedValue(new Blob(["synthetic"], { type: "image/png" })); });
afterEach(() => vi.restoreAllMocks());
it("uses originals directly without annotations", async () => {
  const use = vi.fn().mockResolvedValue("ok");
  expect(await withAnnotations(document, [], use)).toBe("ok");
  expect(use).toHaveBeenCalledWith(document); expect(renderer).not.toHaveBeenCalled();
});
it("releases only temporary rendered URL after consumer failure", async () => {
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  let temporary = "";
  await expect(withAnnotations(document, [annotation], async (value) => {
    temporary = value.src;
    expect(value.name).toBe("original.png"); expect(value.id).toBe("source");
    throw new Error("synthetic consumer failure");
  })).rejects.toThrow("synthetic consumer failure");
  expect(revoke).toHaveBeenCalledExactlyOnceWith(temporary);
  expect(temporary).not.toBe(document.src); expect(document.src).toBe("blob:original");
});
it("creates an independently owned merged document and treats fully transparent layers as invisible", async () => {
  const result = await renderAnnotatedDocument(document, [{ ...annotation, style: { ...annotation.style, opacity: 0 } }]);
  try { expect(result.id).not.toBe(document.id); expect(result.name).toBe("original-merged.png");
    expect(renderer.mock.calls[0][0].annotations).toEqual([]); }
  finally { URL.revokeObjectURL(result.src); }
});
it("rejects invalid colors before allocating a bitmap", async () => {
  await expect(renderAnnotatedDocument(document, [{ ...annotation, style: { ...annotation.style, color: "not-a-color" } }])).rejects.toThrow("hexadecimal");
  expect(renderer).not.toHaveBeenCalled();
});
