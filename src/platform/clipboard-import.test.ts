import { beforeEach, expect, it, vi } from "vitest";
const runtime = vi.hoisted(() => ({ desktop: false, invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => runtime.desktop, invoke: runtime.invoke }));
import { importClipboardImage } from "./native";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";
beforeEach(() => { runtime.desktop = false; runtime.invoke.mockReset(); });
it("requires desktop and never reads the actual clipboard in browser mode", async () => {
  await expect(importClipboardImage()).rejects.toMatchObject({ code: "desktop_required" });
  expect(runtime.invoke).not.toHaveBeenCalled();
});
it("preserves no-image error and transfers validated image URL ownership", async () => {
  runtime.desktop = true; runtime.invoke.mockRejectedValueOnce({ code: "clipboard_no_image", message: "No image" });
  await expect(importClipboardImage()).rejects.toMatchObject({ code: "clipboard_no_image" });
  runtime.invoke.mockResolvedValueOnce({ pngBase64: PNG, width: 2, height: 2, byteSize: atob(PNG).length });
  const document = await importClipboardImage();
  try { expect(document.width).toBe(2); expect(document.name).toMatch(/^Clipboard-/); }
  finally { URL.revokeObjectURL(document.src); }
  expect(runtime.invoke).toHaveBeenLastCalledWith("import_clipboard", {});
});
