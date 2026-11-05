import { describe, expect, it } from "vitest";
import { planOutputSize } from "./index";

describe("planOutputSize", () => {
  it("plans 1x, 2x and fractional downscale explicitly", () => {
    expect(planOutputSize(100, 50, 1, true)).toEqual({ width: 100, height: 50 });
    expect(planOutputSize(100, 50, 2, true)).toEqual({ width: 50, height: 25 });
    expect(planOutputSize(100, 50, 1.5, true)).toEqual({ width: 66, height: 33 });
    expect(planOutputSize(100, 50, 2, false)).toEqual({ width: 100, height: 50 });
  });
  it("keeps small images at one pixel and rejects invalid values", () => {
    expect(planOutputSize(1, 1, 4, true)).toEqual({ width: 1, height: 1 });
    expect(() => planOutputSize(0, 1, 1, true)).toThrow(RangeError);
    expect(() => planOutputSize(1, 1, Infinity, true)).toThrow(RangeError);
    expect(() => planOutputSize(Number.MAX_SAFE_INTEGER + 1, 1, 1, false)).toThrow(RangeError);
  });
});
