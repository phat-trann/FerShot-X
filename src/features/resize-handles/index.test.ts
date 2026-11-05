import { describe, expect, it } from "vitest";
import { resizeRectByHandle } from "./index";

const rect = { x: 20, y: 30, width: 40, height: 50 };

describe("resizeRectByHandle", () => {
  it("resizes each handle direction without mutating input", () => {
    expect(resizeRectByHandle(rect, "nw", { x: -5, y: -10 }, 200, 200)).toEqual({ x: 15, y: 20, width: 45, height: 60 });
    expect(resizeRectByHandle(rect, "n", { x: 0, y: 10 }, 200, 200)).toEqual({ x: 20, y: 40, width: 40, height: 40 });
    expect(resizeRectByHandle(rect, "ne", { x: 10, y: -5 }, 200, 200)).toEqual({ x: 20, y: 25, width: 50, height: 55 });
    expect(resizeRectByHandle(rect, "e", { x: 10, y: 0 }, 200, 200).width).toBe(50);
    expect(resizeRectByHandle(rect, "se", { x: 10, y: 10 }, 200, 200)).toEqual({ x: 20, y: 30, width: 50, height: 60 });
    expect(resizeRectByHandle(rect, "s", { x: 0, y: 10 }, 200, 200).height).toBe(60);
    expect(resizeRectByHandle(rect, "sw", { x: -5, y: 10 }, 200, 200)).toEqual({ x: 15, y: 30, width: 45, height: 60 });
    expect(resizeRectByHandle(rect, "w", { x: 10, y: 0 }, 200, 200)).toEqual({ x: 30, y: 30, width: 30, height: 50 });
    expect(rect).toEqual({ x: 20, y: 30, width: 40, height: 50 });
  });

  it("clamps bounds, crossing and minimum size, and rejects invalid input", () => {
    expect(resizeRectByHandle(rect, "nw", { x: -100, y: -100 }, 100, 100)).toEqual({ x: 0, y: 0, width: 60, height: 80 });
    expect(resizeRectByHandle(rect, "e", { x: -100, y: 0 }, 100, 100, 10).width).toBe(10);
    expect(resizeRectByHandle(rect, "w", { x: 100, y: 0 }, 100, 100, 10).x).toBe(50);
    expect(() => resizeRectByHandle(rect, "x" as "e", { x: 0, y: 0 }, 100, 100)).toThrow(TypeError);
    expect(() => resizeRectByHandle(rect, "e", { x: Infinity, y: 0 }, 100, 100)).toThrow(TypeError);
  });
});
