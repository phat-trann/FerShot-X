import { describe, expect, it } from "vitest";
import { planBackdropSize } from "./index";

describe("planBackdropSize", () => {
  it("adds symmetric inset and rounds fractional output up", () => {
    expect(planBackdropSize(100, 50, 10, 200, 200, 40_000)).toEqual({ width: 120, height: 70, inset: 10 });
    expect(planBackdropSize(100.2, 50.1, 0.25, 200, 200, 40_000)).toEqual({ width: 101, height: 51, inset: 0.25 });
  });

  it("rejects invalid options, overflow and hard caps", () => {
    expect(() => planBackdropSize(0, 1, 1, 100, 100, 100)).toThrow(RangeError);
    expect(() => planBackdropSize(1, 1, -1, 100, 100, 100)).toThrow(RangeError);
    expect(() => planBackdropSize(100, 100, 1, 100, 100, 10_000)).toThrow(RangeError);
    expect(() => planBackdropSize(Number.MAX_VALUE, 1, 1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});
