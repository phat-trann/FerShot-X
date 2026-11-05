import { describe, expect, it } from "vitest";
import { normalizeOcrText } from "./index";

describe("normalizeOcrText", () => {
  it("normalizes line endings and trims only outer/trailing whitespace", () => {
    expect(normalizeOcrText("\n Việt Nam  \r\n\n😀  x \t\n")).toBe(" Việt Nam\n\n😀  x");
  });
  it("handles empty input and rejects wrong or oversized input", () => {
    expect(normalizeOcrText("\r\n")).toBe("");
    expect(() => normalizeOcrText(null as unknown as string)).toThrow(TypeError);
    expect(() => normalizeOcrText("x".repeat(1_000_001))).toThrow(RangeError);
  });
});
