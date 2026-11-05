import { beforeEach, expect, it, vi } from "vitest";
const runtime = vi.hoisted(() => ({ desktop: false, invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => runtime.desktop, invoke: runtime.invoke }));
import { closePinnedImage, copyPinnedImage, documentFromPin, editPinnedImage, pinImage, readPinnedImage } from "./native";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";
beforeEach(() => { runtime.desktop = false; runtime.invoke.mockReset(); });
it("does not open/copy/edit/close pins in browser mode", async () => {
  for (const operation of [() => pinImage({} as never), readPinnedImage, copyPinnedImage, closePinnedImage, editPinnedImage]) {
    await expect(operation()).rejects.toMatchObject({ code: "desktop_required" });
  }
  expect(runtime.invoke).not.toHaveBeenCalled();
});
it("requests only the calling pin's content and actions without an arbitrary target", async () => {
  runtime.desktop = true;
  runtime.invoke.mockResolvedValue({ sourceId: "source", name: "pin.png", image: { pngBase64: PNG, width: 2, height: 2, byteSize: atob(PNG).length } });
  const document = await readPinnedImage();
  try { expect(document.name).toBe("pin.png"); expect(document.width).toBe(2); }
  finally { URL.revokeObjectURL(document.src); }
  runtime.invoke.mockResolvedValue(null);
  await copyPinnedImage(); await editPinnedImage(); await closePinnedImage();
  expect(runtime.invoke.mock.calls.map(([command]) => command)).toEqual(["get_pin", "copy_pin", "edit_pin", "close_pin"]);
  for (const [, args] of runtime.invoke.mock.calls) expect(args).toEqual({});
});
it("rejects malformed pin metadata before creating an image", () => {
  expect(() => documentFromPin({ sourceId: "", name: "bad", image: {} } as never)).toThrow("Invalid pinned image");
});
