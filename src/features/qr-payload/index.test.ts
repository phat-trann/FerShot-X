import { describe, expect, it } from "vitest";
import { classifyQrPayload } from "./index";

describe("classifyQrPayload", () => {
  it("classifies safe mixed-case schemes without changing display text", () => {
    expect(classifyQrPayload(" HTTPS://example.test/ảnh ")).toEqual({ text: " HTTPS://example.test/ảnh ", category: "https" });
    expect(classifyQrPayload("mailto:person@example.test").category).toBe("mailto");
    expect(classifyQrPayload("Xin chào 😀").category).toBe("plain");
  });

  it("marks executable or unsupported schemes inert", () => {
    for (const value of ["javascript:alert(1)", "data:text/html,x", "file:///tmp/x", "custom:value"]) {
      expect(classifyQrPayload(value).category).toBe("unsupported");
    }
  });

  it("rejects control characters and oversized/non-string input", () => {
    expect(() => classifyQrPayload("https://safe.test\njavascript:bad")).toThrow(TypeError);
    expect(() => classifyQrPayload("x".repeat(1_000_001))).toThrow(RangeError);
    expect(() => classifyQrPayload(null as unknown as string)).toThrow(TypeError);
  });
});
