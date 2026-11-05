import { describe, expect, it } from "vitest";
import {
  computeWindowAppearanceLayout,
  type WindowAppearanceRenderRequest,
} from "./window-appearance";

describe("window-appearance layout and validation", () => {
  it("computes cropped dimensions from explicit shadow-trim insets without mutating inputs", () => {
    const dummySource = {} as CanvasImageSource;
    const shadowTrim = Object.freeze({
      top: 12,
      right: 16,
      bottom: 20,
      left: 14,
    });
    const background = Object.freeze({
      kind: "solid" as const,
      color: "#1e293b",
    });
    const request: WindowAppearanceRenderRequest = Object.freeze({
      captureMode: "window",
      windowSource: dummySource,
      windowWidth: 200,
      windowHeight: 120,
      background,
      shadowTrim,
    });

    const layout = computeWindowAppearanceLayout(request);
    expect(layout).toEqual({
      cropX: 14,
      cropY: 12,
      outputWidth: 170,
      outputHeight: 88,
    });
    expect(Object.isFrozen(layout)).toBe(true);
  });

  it("rejects excessive shadow trim, bad colors, and work-cap violations", () => {
    const dummySource = {} as CanvasImageSource;

    expect(() =>
      computeWindowAppearanceLayout({
        windowSource: dummySource,
        windowWidth: 100,
        windowHeight: 80,
        background: { kind: "transparent" },
        shadowTrim: { top: 40, right: 10, bottom: 40, left: 10 },
      }),
    ).toThrow(/non-positive output dimensions/);

    expect(() =>
      computeWindowAppearanceLayout({
        windowSource: dummySource,
        windowWidth: 100,
        windowHeight: 80,
        background: { kind: "solid", color: "not-a-hex" },
      }),
    ).toThrow(/Invalid solid background hex color/);

    expect(() =>
      computeWindowAppearanceLayout({
        windowSource: dummySource,
        windowWidth: 8192,
        windowHeight: 8192,
        background: { kind: "transparent" },
      }),
    ).toThrow(/exceed pixel cap/);

    expect(() =>
      computeWindowAppearanceLayout({
        windowSource: dummySource,
        windowWidth: 100,
        windowHeight: 80,
        background: {
          kind: "wallpaper",
          image: dummySource,
          imageWidth: 8192,
          imageHeight: 8192,
        },
      }),
    ).toThrow(/Wallpaper dimensions/);
  });
});

