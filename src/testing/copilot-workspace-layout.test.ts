import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_NATIVE_BYTES } from "../platform/image-limits";
import { composeWorkspaceLayout, type WorkspaceLayoutPlan } from "../platform/layout";
import type { ImageDocument } from "../contracts/media";

const renderers = vi.hoisted(() => ({
  composition: vi.fn(),
  backdrop: vi.fn(),
}));

vi.mock("../features/composition", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../features/composition")>()),
  renderCompositionToPngBlob: renderers.composition,
}));
vi.mock("../features/backdrop", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../features/backdrop")>()),
  renderBackdropToPngBlob: renderers.backdrop,
}));

const image = (id: string): ImageDocument => ({
  id,
  name: `${id}.png`,
  src: `blob:${id}`,
  width: 10,
  height: 10,
  mimeType: "image/png",
  byteSize: 400,
});

const plan: WorkspaceLayoutPlan = {
  canvasWidth: 20,
  canvasHeight: 20,
  displayScale: 1,
  layers: [
    { id: "one", x: 0, y: 0, width: 10, height: 10, zIndex: 0, opacity: 1 },
  ],
  backdrop: null,
};

function bitmap(width = 10, height = 10) {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

beforeEach(() => {
  vi.clearAllMocks();
  renderers.composition.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  renderers.backdrop.mockResolvedValue(new Blob(["backdrop"], { type: "image/png" }));
  vi.stubGlobal("crypto", { randomUUID: () => "layout-id" });
  vi.stubGlobal("URL", { createObjectURL: () => "blob:layout" });
});

describe("composeWorkspaceLayout independent regressions", () => {
  it("releases earlier prepared bitmaps when a later source fails", async () => {
    const first = bitmap();
    const prepare = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockRejectedValueOnce(new Error("decode failed"));
    const twoLayerPlan = {
      ...plan,
      layers: [
        ...plan.layers,
        { id: "two", x: 10, y: 0, width: 10, height: 10, zIndex: 1, opacity: 1 },
      ],
    };

    await expect(composeWorkspaceLayout(twoLayerPlan, [image("one"), image("two")], prepare))
      .rejects.toThrow("decode failed");
    expect(first.close).toHaveBeenCalledOnce();
    expect(renderers.composition).not.toHaveBeenCalled();
  });

  it("rejects missing and duplicate sources before preparing or rendering", async () => {
    const prepare = vi.fn();
    await expect(composeWorkspaceLayout(plan, [], prepare)).rejects.toThrow(
      "A layout source is missing or duplicated.",
    );
    expect(prepare).not.toHaveBeenCalled();

    const duplicatePlan = {
      ...plan,
      layers: [
        ...plan.layers,
        { id: "one", x: 10, y: 0, width: 10, height: 10, zIndex: 1, opacity: 1 },
      ],
    };
    await expect(composeWorkspaceLayout(duplicatePlan, [image("one")], prepare)).rejects.toThrow(
      "A layout source is missing or duplicated.",
    );
    expect(prepare).not.toHaveBeenCalled();
  });

  it("rejects oversized output and closes prepared source bitmaps", async () => {
    const source = bitmap();
    renderers.composition.mockResolvedValue({ size: MAX_NATIVE_BYTES + 1 });
    await expect(composeWorkspaceLayout(plan, [image("one")], async () => source))
      .rejects.toThrow("Layout PNG exceeds the output budget.");
    expect(source.close).toHaveBeenCalledOnce();
  });

  it("releases backdrop bitmap and returns a new owned document", async () => {
    const source = bitmap();
    const backdrop = bitmap(20, 20);
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(backdrop));
    const withBackdrop = {
      ...plan,
      backdrop: {
        inset: 0,
        cornerRadius: 0,
        fill: { kind: "solid", color: "#ffffff" },
      },
    } as WorkspaceLayoutPlan;

    const result = await composeWorkspaceLayout(withBackdrop, [image("one")], async () => source);
    expect(result.id).toBe("layout-id");
    expect(result.src).toBe("blob:layout");
    expect(source.close).toHaveBeenCalledOnce();
    expect(backdrop.close).toHaveBeenCalledOnce();
    expect(renderers.backdrop).toHaveBeenCalledOnce();
  });
});
