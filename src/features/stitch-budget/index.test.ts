import { describe, expect, it } from "vitest";
import { planStitchBudget } from "./index";

describe("planStitchBudget", () => {
  it("accounts for overlap across one and many frames", () => {
    expect(planStitchBudget(1, 100, 50, 0, 5000)).toEqual({ width: 100, height: 50, pixels: 5000 });
    expect(planStitchBudget(3, 100, 50, 10, 13000)).toEqual({ width: 100, height: 130, pixels: 13000 });
  });

  it("rejects invalid overlap, zero inputs, unsafe arithmetic and hard caps", () => {
    expect(() => planStitchBudget(0, 1, 1, 0, 1)).toThrow(RangeError);
    expect(() => planStitchBudget(2, 10, 10, 10, 100)).toThrow(RangeError);
    expect(() => planStitchBudget(2, 10, 10, -1, 100)).toThrow(RangeError);
    expect(() => planStitchBudget(2, 10, 10, 0, 150)).toThrow(RangeError);
    expect(() => planStitchBudget(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 2, 0, Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});
