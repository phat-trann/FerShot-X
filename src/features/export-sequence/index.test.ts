import { describe, expect, it } from "vitest";
import { generateExportNameSequence } from "./index";

describe("generateExportNameSequence", () => {
  it("generates sanitized extension sequences without disk access", () => {
    expect(generateExportNameSequence("capture.png", "png", 0, 3)).toEqual(["capture.png", "capture-1.png", "capture-2.png"]);
    expect(generateExportNameSequence("ảnh", "jpeg", 4, 2)).toEqual(["ảnh-4.jpg", "ảnh-5.jpg"]);
  });

  it("rejects invalid counters and exhausted limits", () => {
    expect(() => generateExportNameSequence("x", "png", -1)).toThrow(RangeError);
    expect(() => generateExportNameSequence("x", "png", 0, 0)).toThrow(RangeError);
    expect(() => generateExportNameSequence("x", "png", 0, 1001)).toThrow(RangeError);
    expect(() => generateExportNameSequence("x", "png", Number.MAX_SAFE_INTEGER, 2)).toThrow(RangeError);
  });
});
