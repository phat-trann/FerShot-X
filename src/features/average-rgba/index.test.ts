import { describe, expect, it } from "vitest";
import { averageRgba } from "./index";

describe("averageRgba", () => {
  it("computes arithmetic channel means including alpha", () => {
    const bytes = new Uint8Array([255, 0, 0, 255, 0, 0, 255, 0]);
    expect(averageRgba(bytes, 2, 1, { x: 0, y: 0, width: 2, height: 1 })).toEqual({ r: 128, g: 0, b: 128, a: 128 });
  });

  it("supports subregions without mutation", () => {
    const bytes = new Uint8Array([10, 20, 30, 40, 100, 110, 120, 130, 200, 210, 220, 230, 250, 240, 230, 220]);
    const before = [...bytes];
    expect(averageRgba(bytes, 2, 2, { x: 1, y: 0, width: 1, height: 2 })).toEqual({ r: 175, g: 175, b: 175, a: 175 });
    expect([...bytes]).toEqual(before);
  });

  it("rejects invalid bounds, bytes and excessive work", () => {
    expect(() => averageRgba(new Uint8Array(4), 1, 1, { x: 1, y: 0, width: 1, height: 1 })).toThrow(RangeError);
    expect(() => averageRgba(new Uint8Array(3), 1, 1, { x: 0, y: 0, width: 1, height: 1 })).toThrow(RangeError);
    expect(() => averageRgba(new Uint8Array(4), 1, 1, { x: 0, y: 0, width: 0, height: 1 })).toThrow(RangeError);
  });
});
