import { describe, expect, it } from "vitest";
import { fitPrintGeometry } from "./index";

describe("fitPrintGeometry", () => {
  const margins = { top: 10, right: 10, bottom: 10, left: 10 };

  it("fits portrait and landscape images with explicit 1x/2x scales", () => {
    expect(fitPrintGeometry(100, 200, 200, 300, margins, 1)).toMatchObject({
      scale: 1.4, x: 30, y: 10, width: 140, height: 280, printableWidth: 180, printableHeight: 280,
    });
    expect(fitPrintGeometry(400, 200, 200, 300, margins, 2)).toMatchObject({
      scale: 0.9, width: 180, height: 90,
    });
  });

  it("rejects invalid margins, printable area and overflow", () => {
    expect(() => fitPrintGeometry(1, 1, 10, 10, { top: 6, right: 6, bottom: 6, left: 0 }, 1)).toThrow(RangeError);
    expect(() => fitPrintGeometry(0, 1, 10, 10, margins, 1)).toThrow(RangeError);
    expect(() => fitPrintGeometry(1, 1, 10, 10, { ...margins, left: -1 }, 1)).toThrow(RangeError);
    expect(() => fitPrintGeometry(Number.MAX_VALUE, 1, 10, 10, margins, Number.MIN_VALUE)).toThrow(RangeError);
  });
});
