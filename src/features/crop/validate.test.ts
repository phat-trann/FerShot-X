import { describe, expect, it } from "vitest";
import { validateCrop } from "./validate";

describe("validateCrop", () => {
  it("accepts an exact edge crop and returns a copy", () => {
    const input = { x: 10, y: 20, width: 90, height: 80 };
    const result = validateCrop(input, 100, 100);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it("rejects reverse, negative, fractional and zero values", () => {
    expect(() => validateCrop({ x: 20, y: 0, width: -10, height: 10 }, 100, 100)).toThrow();
    expect(() => validateCrop({ x: -1, y: 0, width: 1, height: 1 }, 100, 100)).toThrow();
    expect(() => validateCrop({ x: 0.5, y: 0, width: 1, height: 1 }, 100, 100)).toThrow();
    expect(() => validateCrop({ x: 0, y: 0, width: 0, height: 1 }, 100, 100)).toThrow();
  });

  it("rejects unsafe dimensions and overflow-safe out-of-bounds crops", () => {
    expect(() => validateCrop({ x: 0, y: 0, width: Number.MAX_SAFE_INTEGER, height: 1 }, 100, 100)).toThrow();
    expect(() => validateCrop({ x: 90, y: 0, width: 11, height: 1 }, 100, 100)).toThrow();
    expect(() => validateCrop({ x: 0, y: 90, width: 1, height: 11 }, 100, 100)).toThrow();
  });
});
