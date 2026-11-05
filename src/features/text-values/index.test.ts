import { describe, expect, it } from "vitest";
import { normalizeTextOptions } from "./index";

describe("normalizeTextOptions", () => {
  it("preserves Unicode, tabs and newlines and returns a copy", () => {
    const input = Object.freeze({ text: "Tiếng Việt 😀\n\tline", fontSize: 24, alignment: "center" as const });
    const result = normalizeTextOptions(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it("rejects controls, invalid sizes/alignment and oversized text", () => {
    expect(() => normalizeTextOptions({ text: "bad\u0000", fontSize: 12, alignment: "left" })).toThrow(TypeError);
    expect(() => normalizeTextOptions({ text: "x", fontSize: NaN, alignment: "left" })).toThrow(TypeError);
    expect(() => normalizeTextOptions({ text: "x", fontSize: 513, alignment: "left" })).toThrow(TypeError);
    expect(() => normalizeTextOptions({ text: "x", fontSize: 12, alignment: "justify" as "left" })).toThrow(TypeError);
    expect(() => normalizeTextOptions({ text: "x".repeat(10_001), fontSize: 12, alignment: "left" })).toThrow(RangeError);
  });
});
