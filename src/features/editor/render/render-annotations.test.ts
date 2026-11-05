import { describe, expect, it } from "vitest";
import {
  MAX_POINTS_PER_ANNOTATION,
  validateRenderOptions,
} from "./render-annotations";
import type { Annotation } from "../../../contracts/editor";

describe("validateRenderOptions", () => {
  const validRect: Annotation = {
    id: "r1",
    tool: "rectangle",
    points: [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
    ],
    style: { color: "#ff0000", strokeWidth: 4, opacity: 1 },
  };

  it("accepts valid rectangle, arrow, and pen annotations within image bounds", () => {
    expect(() =>
      validateRenderOptions({
        source: "blob:synthetic",
        width: 200,
        height: 150,
        annotations: [validRect],
      }),
    ).not.toThrow();
  });

  it("rejects unsupported tools (blur, ellipse, text, counter) explicitly", () => {
    for (const tool of ["blur", "ellipse", "text", "counter"] as const) {
      expect(() =>
        validateRenderOptions({
          source: "blob:synthetic",
          width: 200,
          height: 150,
          annotations: [
            {
              ...validRect,
              id: `unsupported-${tool}`,
              tool,
            },
          ],
        }),
      ).toThrow(/unsupported annotation tool/i);
    }
  });

  it("rejects out-of-bounds coordinates, excessive point counts, and invalid styles", () => {
    expect(() =>
      validateRenderOptions({
        source: "blob:synthetic",
        width: 100,
        height: 100,
        annotations: [
          {
            ...validRect,
            points: [
              { x: 10, y: 10 },
              { x: 120, y: 50 },
            ],
          },
        ],
      }),
    ).toThrow(/out-of-bounds/i);

    const tooManyPoints = Array.from(
      { length: MAX_POINTS_PER_ANNOTATION + 1 },
      (_, idx) => ({
        x: idx % 50,
        y: idx % 50,
      }),
    );
    expect(() =>
      validateRenderOptions({
        source: "blob:synthetic",
        width: 100,
        height: 100,
        annotations: [
          {
            id: "pen-overflow",
            tool: "pen",
            points: tooManyPoints,
            style: { color: "#00ff00", strokeWidth: 2, opacity: 1 },
          },
        ],
      }),
    ).toThrow(/exceeds maximum point count/i);
  });
});

