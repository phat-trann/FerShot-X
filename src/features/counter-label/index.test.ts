import { describe, expect, it } from "vitest";
import { formatCounterLabel } from "./index";

describe("formatCounterLabel", () => {
  it("formats minimum, maximum and Unicode affixes", () => {
    expect(formatCounterLabel(1)).toBe("1");
    expect(formatCounterLabel(Number.MAX_SAFE_INTEGER, "№ ", " ✅")).toBe("№ 9007199254740991 ✅");
  });

  it("rejects invalid numbers and affix types", () => {
    expect(() => formatCounterLabel(0)).toThrow(RangeError);
    expect(() => formatCounterLabel(1.5)).toThrow(RangeError);
    expect(() => formatCounterLabel(Infinity)).toThrow(RangeError);
    expect(() => formatCounterLabel(1, null as unknown as string)).toThrow(TypeError);
  });

  it("enforces affix and complete-label limits", () => {
    expect(() => formatCounterLabel(1, "x".repeat(97))).toThrow(RangeError);
    expect(() => formatCounterLabel(1, "x".repeat(256))).toThrow(RangeError);
  });
});
