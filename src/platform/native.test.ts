import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const runtime = vi.hoisted(() => ({ desktop: false, invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => runtime.desktop, invoke: runtime.invoke }));
import { captureImage, copyImage, documentFromPayload, readAppInfo, saveImage, type ImagePayload } from "./native";

const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";
const valid = (): ImagePayload => ({ pngBase64, width: 2, height: 2, byteSize: atob(pngBase64).length });
beforeEach(() => { runtime.desktop = false; runtime.invoke.mockReset(); });
afterEach(() => vi.restoreAllMocks());

describe("native adapter boundary", () => {
  it("does not call native operations in a browser", async () => {
    expect(await readAppInfo()).toBeNull();
    await expect(captureImage("area")).rejects.toMatchObject({ code: "desktop_required" });
    await expect(saveImage({} as never, "png")).rejects.toMatchObject({ code: "desktop_required" });
    await expect(copyImage({} as never)).rejects.toMatchObject({ code: "desktop_required" });
    expect(runtime.invoke).not.toHaveBeenCalled();
  });
  it("preserves cancellation code and error messages", async () => {
    runtime.desktop = true;
    runtime.invoke.mockRejectedValue({ code: "cancelled", message: "Capture cancelled." });
    await expect(captureImage("window")).rejects.toMatchObject({ code: "cancelled", message: "Capture cancelled." });
    expect(runtime.invoke).toHaveBeenCalledExactlyOnceWith("capture_image", { mode: "window" });
  });
  it("accepts a validated native image and gives the caller URL ownership", async () => {
    runtime.desktop = true; runtime.invoke.mockResolvedValue(valid());
    const result = await captureImage("fullscreen");
    try { expect(result).toMatchObject({ width: 2, height: 2, mimeType: "image/png" }); expect(result.src).toMatch(/^blob:/); }
    finally { URL.revokeObjectURL(result.src); }
  });
  it("rejects corrupt/mismatched/oversized metadata before allocating a URL", () => {
    const create = vi.spyOn(URL, "createObjectURL");
    for (const payload of [null, { ...valid(), width: 3 }, { ...valid(), byteSize: 1 },
      { ...valid(), pngBase64: "invalid%%%" }, { ...valid(), width: 8192, height: 8192 }]) {
      expect(() => documentFromPayload(payload as ImagePayload, "image.png")).toThrow();
    }
    expect(create).not.toHaveBeenCalled();
  });
});
