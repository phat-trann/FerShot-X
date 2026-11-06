import { beforeEach, describe, expect, it, vi } from "vitest";

const transformImage = vi.hoisted(() => vi.fn());
vi.mock("../platform/native", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../platform/native")>()),
  transformImage,
}));

import { withOutputPreferences } from "../platform/output-preferences";
import type { ImageDocument } from "../contracts/media";
import type { AppSettings } from "../contracts/settings";

const document: ImageDocument = {
  id: "image-1",
  name: "capture.png",
  src: "blob:original",
  width: 200,
  height: 100,
  mimeType: "image/png",
  byteSize: 400,
};
const enabled: AppSettings = {
  saveFormat: "png",
  jpegQuality: 90,
  downscaleRetina: true,
  showPreview: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("URL", { revokeObjectURL: vi.fn() });
  transformImage.mockResolvedValue({
    ...document,
    src: "blob:resized",
    width: 100,
    height: 50,
  });
});

describe("withOutputPreferences independent regressions", () => {
  it("preserves the original document for unknown, unity and disabled scaling", async () => {
    const use = vi.fn(async (output: ImageDocument) => output);
    await expect(withOutputPreferences(document, enabled, null, use)).resolves.toBe(document);
    await expect(withOutputPreferences(document, enabled, 1, use)).resolves.toBe(document);
    await expect(
      withOutputPreferences(document, { ...enabled, downscaleRetina: false }, 2, use),
    ).resolves.toBe(document);
    expect(transformImage).not.toHaveBeenCalled();
  });

  it("plans a Retina transform while preserving document identity metadata", async () => {
    const use = vi.fn(async (output: ImageDocument) => output);
    const result = await withOutputPreferences(document, enabled, 2, use);
    expect(transformImage).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      id: document.id,
      name: document.name,
      src: "blob:resized",
      width: 100,
      height: 50,
    });
  });

  it("revokes a resized URL after successful use and after failure", async () => {
    const revoke = (URL.revokeObjectURL as ReturnType<typeof vi.fn>);
    await withOutputPreferences(document, enabled, 2, async () => "ok");
    expect(revoke).toHaveBeenCalledWith("blob:resized");

    const error = new Error("consumer failed");
    await expect(
      withOutputPreferences(document, enabled, 2, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(revoke).toHaveBeenCalledTimes(2);
  });
});
