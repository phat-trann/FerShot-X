import { describe, expect, it } from "vitest";
import { hexToRgb, rgbToHex } from "./color";

describe("rgbToHex", () => {
  it("formats channel boundaries", () => {
    expect(rgbToHex(0, 1, 255)).toBe("#0001ff");
  });

  it("round-trips RGB values", () => {
    const rgb = { r: 18, g: 171, b: 240 };
    expect(hexToRgb(rgbToHex(rgb.r, rgb.g, rgb.b))).toEqual(rgb);
  });

  it("rejects non-integer or out-of-range channels", () => {
    expect(() => rgbToHex(-1, 0, 0)).toThrow(RangeError);
    expect(() => rgbToHex(0, 1.5, 0)).toThrow(RangeError);
    expect(() => rgbToHex(0, 0, 256)).toThrow(RangeError);
  });
});

describe("hexToRgb", () => {
  it("expands short hex notation", () => {
    expect(hexToRgb("#0Af")).toEqual({ r: 0, g: 170, b: 255 });
  });

  it("rejects alpha, missing hash, malformed and empty values", () => {
    for (const value of ["#1234", "#12345678", "123456", "#12", "#ggg", ""]) {
      expect(() => hexToRgb(value)).toThrow(TypeError);
    }
  });
});
