import { describe, expect, it } from "vitest";
import { readPngHeader } from "./index";

function header(width: number, height: number, type = 0x49484452): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13); view.setUint32(12, type); view.setUint32(16, width); view.setUint32(20, height);
  return bytes;
}

describe("readPngHeader", () => {
  it("reads a valid header and applies caller limits", () => {
    expect(readPngHeader(header(4, 3), 12)).toEqual({ width: 4, height: 3 });
    expect(() => readPngHeader(header(4, 3), 11)).toThrow(RangeError);
  });
  it("rejects incomplete, false, wrong and invalid dimensions", () => {
    expect(() => readPngHeader(new Uint8Array(32))).toThrow(RangeError);
    expect(() => readPngHeader(header(1, 1).fill(0, 0, 1))).toThrow(TypeError);
    expect(() => readPngHeader(header(1, 1, 0))).toThrow(TypeError);
    expect(() => readPngHeader(header(0, 1))).toThrow(RangeError);
    expect(() => readPngHeader(header(0x80000000, 1))).toThrow(RangeError);
    expect(() => readPngHeader(header(0x7fffffff, 0x7fffffff), Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});
