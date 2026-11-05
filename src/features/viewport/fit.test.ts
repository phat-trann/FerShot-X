import { describe, expect, it } from "vitest";
import { fitImage } from "./fit";

describe("fitImage", () => {
  it("fits portrait and landscape images without changing aspect ratio", () => {
    expect(fitImage(100, 200, 300, 300)).toEqual({ scale: 1, width: 100, height: 200 });
    expect(fitImage(400, 200, 300, 300)).toEqual({ scale: 0.75, width: 300, height: 150 });
  });

  it("supports opt-in upscale", () => {
    expect(fitImage(100, 50, 300, 300, true)).toEqual({ scale: 3, width: 300, height: 150 });
  });

  it("rejects invalid and overflowing inputs", () => {
    expect(() => fitImage(0, 1, 1, 1)).toThrow(RangeError);
    expect(() => fitImage(NaN, 1, 1, 1)).toThrow(TypeError);
    expect(() => fitImage(Infinity, 1, 1, 1)).toThrow(TypeError);
    expect(() => fitImage(Number.MAX_VALUE, 1, Number.MIN_VALUE, 1, true)).toThrow(RangeError);
    expect(() => fitImage(Number.MIN_VALUE, Number.MAX_VALUE, 1, 1)).toThrow(RangeError);
  });
});
