import { beforeEach, describe, expect, it, vi } from "vitest";

const ipc = vi.hoisted(() => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => true),
}));

vi.mock("@tauri-apps/api/core", () => ipc);

import {
  documentFromPayload,
  readCaptureDisplay,
  stitchCapturedFrames,
} from "../platform/native";
import { MAX_NATIVE_BYTES } from "../platform/image-limits";
import type { ImageDocument } from "../contracts/media";

const frame: ImageDocument = {
  id: "frame-1",
  name: "frame.png",
  src: "blob:frame",
  width: 2,
  height: 2,
  mimeType: "image/png",
  byteSize: 24,
};

function payload(width = 2, height = 2) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return {
    pngBase64: btoa(String.fromCharCode(...bytes)),
    width,
    height,
    byteSize: bytes.length,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:payload") });
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 2;
      naturalHeight = 2;
      set src(_value: string) {}
      async decode() {}
    },
  );
  vi.stubGlobal("window", {
    document: {
      createElement: () => ({
        width: 2,
        height: 2,
        getContext: () => ({ drawImage: vi.fn() }),
        toDataURL: () => `data:image/png;base64,${btoa("png")}`,
      }),
    },
  });
});

describe("capture/stitch IPC boundary independent regressions", () => {
  it("rejects invalid display metadata from the native boundary", async () => {
    ipc.invoke.mockResolvedValueOnce({
      id: "display",
      x: 0,
      y: 0,
      width: 0,
      height: 800,
      scale: 2,
    });
    await expect(readCaptureDisplay()).rejects.toMatchObject({ code: "display_unavailable" });
  });

  it("rejects frame count and height budgets before native stitching", async () => {
    await expect(
      stitchCapturedFrames([], { reverseDirection: false, maxHeight: 8_192 }, new AbortController().signal),
    ).rejects.toThrow("Invalid stitch request");
    await expect(
      stitchCapturedFrames([frame], { reverseDirection: false, maxHeight: 399 }, new AbortController().signal),
    ).rejects.toThrow("Invalid stitch request");
    expect(ipc.invoke).not.toHaveBeenCalled();
  });

  it("rejects pre-aborted stitching without invoking native IPC", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      stitchCapturedFrames([frame], { reverseDirection: false, maxHeight: 8_192 }, controller.signal),
    ).rejects.toMatchObject({ code: "cancelled" });
    expect(ipc.invoke).not.toHaveBeenCalled();
  });

  it("rejects malformed PNG payloads without creating output URLs", () => {
    const createObjectURL = URL.createObjectURL as ReturnType<typeof vi.fn>;
    expect(() =>
      documentFromPayload(
        { ...payload(), pngBase64: btoa("not-png"), byteSize: 7 },
        "bad.png",
      ),
    ).toThrow(/invalid image payload|could not be decoded|metadata/i);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(MAX_NATIVE_BYTES).toBeGreaterThan(0);
  });

  it("checks cancellation after a late native stitch response", async () => {
    let resolveInvoke!: (value: ReturnType<typeof payload>) => void;
    ipc.invoke.mockImplementationOnce(
      () => new Promise((resolve) => (resolveInvoke = resolve)),
    );
    const controller = new AbortController();
    const pending = stitchCapturedFrames(
      [frame],
      { reverseDirection: false, maxHeight: 8_192 },
      controller.signal,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    resolveInvoke(payload());
    await expect(pending).rejects.toMatchObject({ code: "cancelled" });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
