import { describe, expect, it } from "vitest";
import {
  planBackdropLayout,
  validateBackdropOptions,
} from "./backdrop-renderer";

describe("backdrop-renderer layout & validation (A20)", () => {
  it("computes inset, aspect-ratio expansion, and recenter layout deterministically", () => {
    const dummySource = {} as CanvasImageSource;

    const layout = planBackdropLayout({
      source: dummySource,
      sourceWidth: 100,
      sourceHeight: 50,
      inset: 20,
      cornerRadius: 8,
      aspectRatio: 2, // base 140x90 -> expands width to 180x90
      offsetX: 30,
      offsetY: -10,
      recenter: true, // ignores offsetX/offsetY
      fill: { kind: "solid", color: "#1e293b" },
    });

    expect(layout).toEqual({
      canvasWidth: 180,
      canvasHeight: 90,
      drawX: 40,
      drawY: 20,
    });
  });

  it("rejects invalid colors, negative insets, and oversized shadow/dimension limits", () => {
    const dummySource = {} as CanvasImageSource;

    expect(() =>
      validateBackdropOptions({
        source: dummySource,
        sourceWidth: 100,
        sourceHeight: 100,
        inset: 10,
        cornerRadius: 4,
        fill: { kind: "solid", color: "rgb(0,0,0)" },
      }),
    ).toThrow(/hex color/i);

    expect(() =>
      validateBackdropOptions({
        source: dummySource,
        sourceWidth: 100,
        sourceHeight: 100,
        inset: 600,
        cornerRadius: 4,
        fill: { kind: "solid", color: "#000000" },
      }),
    ).toThrow(/inset/i);

    expect(() =>
      validateBackdropOptions({
        source: dummySource,
        sourceWidth: 100,
        sourceHeight: 100,
        inset: 10,
        cornerRadius: 4,
        fill: { kind: "solid", color: "#000000" },
        shadow: { blur: 99, offsetX: 0, offsetY: 0, color: "#000000" },
      }),
    ).toThrow(/shadow blur/i);
  });
});

