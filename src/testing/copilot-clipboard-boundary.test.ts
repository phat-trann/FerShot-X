import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({ desktop: false, invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => runtime.desktop, invoke: runtime.invoke }));
import { copyImage } from "../platform/native";

const documentImage = { id: "1", name: "test.png", src: "blob:test", width: 2, height: 2, mimeType: "image/png", byteSize: 4 };

beforeEach(() => { runtime.desktop = false; runtime.invoke.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("copyImage boundary", () => {
  it("reports desktop_required without touching native invoke", async () => {
    await expect(copyImage(documentImage)).rejects.toMatchObject({ code: "desktop_required" });
    expect(runtime.invoke).not.toHaveBeenCalled();
  });

  it("rejects invalid dimensions before decode or invoke", async () => {
    runtime.desktop = true;
    const image = { ...documentImage, width: 0 };
    await expect(copyImage(image)).rejects.toThrow();
    expect(runtime.invoke).not.toHaveBeenCalled();
  });

  it("preserves decoder rejection and never invokes native", async () => {
    runtime.desktop = true;
    class RejectingImage { src = ""; naturalWidth = 2; naturalHeight = 2; decode = vi.fn().mockRejectedValue(new Error("decode failed")); }
    vi.stubGlobal("Image", RejectingImage);
    await expect(copyImage(documentImage)).rejects.toThrow("decode failed");
    expect(runtime.invoke).not.toHaveBeenCalled();
  });

  it("preserves structured native errors after successful rasterization", async () => {
    runtime.desktop = true;
    class ReadyImage { src = ""; naturalWidth = 2; naturalHeight = 2; decode = vi.fn().mockResolvedValue(undefined); }
    vi.stubGlobal("Image", ReadyImage);
    vi.stubGlobal("window", { document: { createElement: () => ({
      width: 2, height: 2, getContext: () => ({ drawImage: vi.fn() }),
      toDataURL: () => "data:image/png;base64,iVBORw0KGgo=",
    }) } });
    runtime.invoke.mockRejectedValue({ code: "clipboard_failed", message: "Clipboard unavailable." });
    await expect(copyImage(documentImage)).rejects.toMatchObject({ code: "clipboard_failed", message: "Clipboard unavailable." });
    expect(runtime.invoke).toHaveBeenCalledOnce();
  });
});
