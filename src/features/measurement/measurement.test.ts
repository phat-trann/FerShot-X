import { describe, expect, it } from "vitest";
import { clampPointToImage, normalizeRect, pixelsToPoints } from "./measurement";

describe("measurement utilities", () => {
  it("normalizes reverse drags", () => {
    expect(normalizeRect({ x: 80, y: 60 }, { x: 20, y: 10 })).toEqual({
      x: 20, y: 10, width: 60, height: 50,
    });
  });

  it("clamps points to image bounds", () => {
    expect(clampPointToImage({ x: -4, y: 120 }, 100, 100)).toEqual({ x: 0, y: 100 });
  });

  it("converts pixels using 1x and 2x display scales", () => {
    expect(pixelsToPoints(24, 1)).toBe(24);
    expect(pixelsToPoints(24, 2)).toBe(12);
  });

  it("rejects non-finite values and invalid dimensions/scales", () => {
    expect(() => normalizeRect({ x: NaN, y: 0 }, { x: 1, y: 1 })).toThrow(TypeError);
    expect(() => clampPointToImage({ x: 0, y: 0 }, 0, 100)).toThrow(RangeError);
    expect(() => pixelsToPoints(Infinity, 1)).toThrow(TypeError);
    expect(() => pixelsToPoints(1, -1)).toThrow(RangeError);
  });
});
