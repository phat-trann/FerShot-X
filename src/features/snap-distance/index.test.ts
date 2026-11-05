import { describe, expect, it } from "vitest";
import { findNearestSnapCandidate } from "./index";

describe("findNearestSnapCandidate", () => {
  it("finds exact and tolerance matches while preserving candidate order on ties", () => {
    const candidates = Object.freeze([{ x: 5, y: 0 }, { x: 0, y: 5 }, { x: 20, y: 20 }]);
    expect(findNearestSnapCandidate({ x: 5, y: 0 }, candidates, 0)).toEqual({ point: { x: 5, y: 0 }, index: 0, distance: 0 });
    expect(findNearestSnapCandidate({ x: 0, y: 0 }, candidates, 6)?.index).toBe(0);
    expect(findNearestSnapCandidate({ x: 0, y: 0 }, candidates, 1)).toBeNull();
  });

  it("rejects invalid distances and bounds candidate count", () => {
    expect(() => findNearestSnapCandidate({ x: 0, y: 0 }, [{ x: Infinity, y: 0 }], 1)).toThrow(TypeError);
    expect(() => findNearestSnapCandidate({ x: 0, y: 0 }, [], -1)).toThrow(RangeError);
    expect(() => findNearestSnapCandidate({ x: 0, y: 0 }, Array.from({ length: 1025 }, () => ({ x: 0, y: 0 })), 1)).toThrow(RangeError);
    expect(() => findNearestSnapCandidate({ x: 0, y: 0 }, [{ x: 1e308, y: 1e308 }], 1e308)).toThrow(RangeError);
  });
});
