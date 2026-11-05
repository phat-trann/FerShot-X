import { describe, expect, it } from "vitest";
import { formatByteSize } from "./index";

describe("formatByteSize", () => {
  it("formats IEC units and rounds non-byte values to one decimal", () => {
    expect(formatByteSize(0)).toBe("0 B");
    expect(formatByteSize(1024)).toBe("1 KiB");
    expect(formatByteSize(1024 ** 2)).toBe("1 MiB");
    expect(formatByteSize(1536)).toBe("1.5 KiB");
  });
  it("rejects invalid values and supports safe maximum", () => {
    expect(formatByteSize(Number.MAX_SAFE_INTEGER)).toContain("GiB");
    expect(() => formatByteSize(-1)).toThrow(RangeError);
    expect(() => formatByteSize(1.5)).toThrow(RangeError);
    expect(() => formatByteSize(NaN)).toThrow(RangeError);
  });
});
