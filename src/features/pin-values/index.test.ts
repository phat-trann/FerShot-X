import { describe, expect, it } from "vitest";
import { normalizePinOptions } from "./index";

describe("normalizePinOptions", () => {
  it("uses defaults and clamps finite values", () => {
    expect(normalizePinOptions()).toEqual({ scale: 1, opacity: 1 });
    expect(normalizePinOptions({ scale: 0, opacity: 2 })).toEqual({ scale: 0.1, opacity: 1 });
    expect(normalizePinOptions({ scale: 8, opacity: 0 })).toEqual({ scale: 4, opacity: 0.1 });
  });

  it("rejects non-finite and wrong types", () => {
    expect(() => normalizePinOptions({ scale: NaN })).toThrow(TypeError);
    expect(() => normalizePinOptions({ opacity: Infinity })).toThrow(TypeError);
    expect(() => normalizePinOptions({ scale: "2" as unknown as number })).toThrow(TypeError);
    expect(() => normalizePinOptions({ scale: null as unknown as number })).toThrow(TypeError);
    expect(() => normalizePinOptions(null as unknown as Partial<{ scale: number; opacity: number }>)).toThrow(TypeError);
  });

  it("returns a fresh value without mutating input", () => {
    const input = { scale: 2, opacity: 0.5 };
    const result = normalizePinOptions(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });
});
