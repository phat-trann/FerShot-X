import { describe, expect, it, vi } from "vitest";
import {
  createStitchBackendAdapter,
  type RgbaImage,
  type StitchAdapterPorts,
} from "../features/stitch-backend-adapter";
import type { CaptureFrame } from "../features/capture-session";

const image: RgbaImage = Object.freeze({
  width: 1,
  height: 2,
  rgba: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
});

function frame(overrides: Partial<CaptureFrame<RgbaImage>> = {}): CaptureFrame<RgbaImage> {
  return {
    value: image,
    width: 1,
    height: 2,
    byteSize: image.rgba.byteLength,
    release: vi.fn(),
    ...overrides,
  };
}

function ports(overrides: Partial<StitchAdapterPorts> = {}): StitchAdapterPorts {
  return {
    acquire: async () => frame(),
    stitch: async () => ({
      value: {
        width: 1,
        height: 2,
        rgba: new Uint8Array(image.rgba),
        matchedOverlaps: [],
        skippedDuplicates: 0,
      },
      release: vi.fn(),
    }),
    ...overrides,
  };
}

describe("Stitch backend adapter independent regressions", () => {
  it("rejects malformed frame geometry before transport", async () => {
    const stitch = vi.fn(ports().stitch);
    const backend = createStitchBackendAdapter({ ...ports(), stitch });
    const invalid = frame({ byteSize: 7 });

    await expect(backend.stitch([invalid], new AbortController().signal))
      .rejects.toThrow("Invalid stitch frame geometry/RGBA");
    expect(stitch).not.toHaveBeenCalled();
  });

  it("rejects aggregate input budgets before dispatch", async () => {
    const stitch = vi.fn(ports().stitch);
    const backend = createStitchBackendAdapter(
      { ...ports(), stitch },
      { maxInputBytes: image.rgba.byteLength },
    );

    await expect(
      backend.stitch([frame(), frame()], new AbortController().signal),
    ).rejects.toThrow("Stitch input budget exceeded");
    expect(stitch).not.toHaveBeenCalled();
  });

  it("releases malformed output leases and rejects invalid RGBA", async () => {
    const release = vi.fn();
    const backend = createStitchBackendAdapter(
      ports({
        stitch: async () => ({
          value: {
            width: 1,
            height: 2,
            rgba: new Uint8Array([1, 2]),
            matchedOverlaps: [],
            skippedDuplicates: 0,
          },
          release,
        }),
      }),
    );

    await expect(backend.stitch([frame()], new AbortController().signal))
      .rejects.toThrow("Invalid stitch output envelope/budget");
    expect(release).toHaveBeenCalledOnce();
  });

  it("releases a late output lease after cancellation", async () => {
    const controller = new AbortController();
    const release = vi.fn();
    let resolveStitch!: (lease: {
      value: unknown;
      release: () => void;
    }) => void;
    const backend = createStitchBackendAdapter(
      ports({
        stitch: async () =>
          new Promise((resolve) => {
            resolveStitch = resolve;
          }),
      }),
    );
    const pending = backend.stitch([frame()], controller.signal);
    controller.abort();
    resolveStitch({
      value: {
        width: 1,
        height: 2,
        rgba: new Uint8Array(image.rgba),
        matchedOverlaps: [],
        skippedDuplicates: 0,
      },
      release,
    });

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(release).toHaveBeenCalledOnce();
  });
});
