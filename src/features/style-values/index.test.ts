import { describe, expect, it } from "vitest";
import { validateAnnotationStyle } from "./index";

describe("validateAnnotationStyle", () => {
  it("copies supported hex colors and bounded values", () => {
    const input = Object.freeze({ color: "#AbC", strokeWidth: 4, opacity: 0.5 });
    const result = validateAnnotationStyle(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it("rejects malformed or unsupported color syntax", () => {
    for (const color of ["red", "rgb(0,0,0)", "var(--color)", "#1234", "#ggg", ""]) {
      expect(() => validateAnnotationStyle({ color, strokeWidth: 1, opacity: 1 })).toThrow(RangeError);
    }
  });

  it("rejects invalid widths and alpha values", () => {
    expect(() => validateAnnotationStyle({ color: "#fff", strokeWidth: 0, opacity: 1 })).toThrow(RangeError);
    expect(() => validateAnnotationStyle({ color: "#fff", strokeWidth: Infinity, opacity: 1 })).toThrow(RangeError);
    expect(() => validateAnnotationStyle({ color: "#fff", strokeWidth: 1001, opacity: 1 })).toThrow(RangeError);
    expect(() => validateAnnotationStyle({ color: "#fff", strokeWidth: 1, opacity: 1.1 })).toThrow(RangeError);
  });
});
