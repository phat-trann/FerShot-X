import { describe, expect, it } from "vitest";
import { sampleRgba } from "./index";

describe("sampleRgba", () => {
  it("reads row-major channels and does not mutate source", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(sampleRgba(bytes, 2, 1, 1, 0)).toEqual({ r: 5, g: 6, b: 7, a: 8 });
    expect([...bytes]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it("rejects invalid lengths, coordinates and dimensions", () => {
    expect(() => sampleRgba(new Uint8Array(4), 2, 1, 0, 0)).toThrow(RangeError);
    expect(() => sampleRgba(new Uint8Array(4), 1, 1, 1, 0)).toThrow(RangeError);
    expect(() => sampleRgba(new Uint8Array(0), Number.MAX_SAFE_INTEGER, 2, 0, 0)).toThrow(RangeError);
  });
});
