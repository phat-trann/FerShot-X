import { describe, expect, it } from "vitest";
import { mapClientPoint } from "./index";

describe("mapClientPoint", () => {
  const bounds = { x: 10, y: 20, width: 200, height: 100 };
  it("maps offsets and fractional zoom", () => {
    expect(mapClientPoint({ x: 110, y: 70 }, bounds, { width: 400, height: 200 })).toEqual({ x: 200, y: 100 });
  });
  it("clamps outside coordinates and rejects invalid values", () => {
    expect(mapClientPoint({ x: -1, y: 1000 }, bounds, { width: 400, height: 200 })).toEqual({ x: 0, y: 200 });
    expect(() => mapClientPoint({ x: 0, y: 0 }, { ...bounds, width: 0 }, { width: 1, height: 1 })).toThrow(RangeError);
    expect(() => mapClientPoint({ x: Infinity, y: 0 }, bounds, { width: 1, height: 1 })).toThrow(TypeError);
  });
});
