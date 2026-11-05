import { describe, expect, it } from "vitest";
import { safeExportName } from "./names";

describe("safeExportName", () => {
  it("removes traversal separators and normalizes duplicate extensions", () => {
    expect(safeExportName("../capture.png.png", "png")).toBe(".._capture.png");
    expect(safeExportName("photo.JPEG", "jpeg")).toBe("photo.jpg");
  });

  it("preserves Unicode while bounding the complete filename", () => {
    expect(safeExportName("猫".repeat(20), "jpeg", 10)).toBe(`${"猫".repeat(6)}.jpg`);
  });

  it("rejects empty, dot-only, invalid format and impossible lengths", () => {
    expect(() => safeExportName("", "png")).toThrow(TypeError);
    expect(() => safeExportName("...", "png")).toThrow(TypeError);
    expect(() => safeExportName("image", "gif" as "png")).toThrow(TypeError);
    expect(() => safeExportName("image", "png", 4)).toThrow(RangeError);
  });

  it("sanitizes control characters", () => {
    expect(safeExportName("a\u0000b", "png")).toBe("a_b.png");
  });
});
