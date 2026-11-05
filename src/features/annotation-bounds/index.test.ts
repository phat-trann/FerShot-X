import { describe, expect, it } from "vitest";
import { annotationBounds } from "./index";
import type { Annotation } from "../../contracts/editor";

const make = (tool: Annotation["tool"], points: Annotation["points"]): Annotation => ({
  id: "a", tool, points, style: { color: "#fff", strokeWidth: 2, opacity: 1 },
});

describe("annotationBounds", () => {
  it("includes stroke padding and handles reverse/multiple points", () => {
    expect(annotationBounds(make("rectangle", [{ x: 10, y: 20 }, { x: 2, y: 4 }]))).toEqual({ x: 1, y: 3, width: 10, height: 18 });
    expect(annotationBounds(make("pen", [{ x: 0, y: 5 }, { x: 4, y: 1 }, { x: 2, y: 9 }]))).toEqual({ x: -1, y: 0, width: 6, height: 10 });
  });
  it("handles empty points and rejects unsupported/invalid inputs", () => {
    expect(annotationBounds(make("arrow", []))).toBeNull();
    expect(() => annotationBounds(make("text", [{ x: 0, y: 0 }]))).toThrow(TypeError);
    expect(() => annotationBounds(make("pen", [{ x: NaN, y: 0 }]))).toThrow(TypeError);
    expect(() => annotationBounds(make("pen", [{ x: -1e308, y: 0 }, { x: 1e308, y: 0 }]))).toThrow(RangeError);
  });
});
