import { describe, expect, it } from "vitest";
import { intersectRects } from "./index";

describe("intersectRects", () => {
  it("handles contained and partial intersections", () => {
    expect(intersectRects({ x: 0, y: 0, width: 10, height: 10 }, { x: 2, y: 2, width: 3, height: 3 })).toEqual({ x: 2, y: 2, width: 3, height: 3 });
    expect(intersectRects({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toEqual({ x: 5, y: 5, width: 5, height: 5 });
  });
  it("returns null for disjoint or edge-only contact and rejects invalid geometry", () => {
    expect(intersectRects({ x: 0, y: 0, width: 1, height: 1 }, { x: 1, y: 0, width: 1, height: 1 })).toBeNull();
    expect(intersectRects({ x: 0, y: 0, width: 1, height: 1 }, { x: 2, y: 0, width: 1, height: 1 })).toBeNull();
    expect(() => intersectRects({ x: 0, y: 0, width: -1, height: 1 }, { x: 0, y: 0, width: 1, height: 1 })).toThrow(RangeError);
    expect(() => intersectRects({ x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 1 }, { x: 0, y: 0, width: 1, height: 1 })).toThrow(RangeError);
  });
});
