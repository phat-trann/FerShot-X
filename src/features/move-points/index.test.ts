import { describe, expect, it } from "vitest";
import { movePointsWithinBounds } from "./index";

describe("movePointsWithinBounds", () => {
  it("preserves relative geometry for multiple points", () => {
    const points = Object.freeze([{ x: 10, y: 20 }, { x: 30, y: 50 }]);
    expect(movePointsWithinBounds(points, { x: 5, y: -10 }, 100, 100)).toEqual([
      { x: 15, y: 10 }, { x: 35, y: 40 },
    ]);
    expect(points).toEqual([{ x: 10, y: 20 }, { x: 30, y: 50 }]);
  });

  it("clamps one shared delta at each image edge", () => {
    expect(movePointsWithinBounds([{ x: 5, y: 5 }, { x: 20, y: 20 }], { x: -20, y: 200 }, 100, 100)).toEqual([
      { x: 0, y: 85 }, { x: 15, y: 100 },
    ]);
  });

  it("rejects invalid or impossible geometry", () => {
    expect(() => movePointsWithinBounds([], { x: 0, y: 0 }, 100, 100)).toThrow(RangeError);
    expect(() => movePointsWithinBounds([{ x: -1, y: 0 }], { x: 0, y: 0 }, 100, 100)).toThrow(RangeError);
    expect(() => movePointsWithinBounds([{ x: 0, y: 0 }], { x: Infinity, y: 0 }, 100, 100)).toThrow(TypeError);
    expect(() => movePointsWithinBounds([{ x: 0, y: 0 }, { x: 101, y: 0 }], { x: 0, y: 0 }, 100, 100)).toThrow(RangeError);
  });
});
