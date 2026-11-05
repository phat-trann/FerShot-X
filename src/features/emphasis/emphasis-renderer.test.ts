import { describe, expect, it } from "vitest";
import {
  EMPHASIS_CONTRACT_PROPOSAL,
  validateEmphasisOptions,
} from "./emphasis-renderer";

describe("emphasis-renderer validation (A18)", () => {
  it("accepts valid highlight, spotlight, and magnifier effects and rejects out-of-bounds or invalid inputs", () => {
    const dummySource = {} as CanvasImageSource;

    expect(() =>
      validateEmphasisOptions({
        source: dummySource,
        width: 200,
        height: 150,
        effects: [
          {
            id: "hl-1",
            kind: "highlight",
            rect: { x: 10, y: 10, width: 50, height: 30 },
            color: "#facc15",
            opacity: 0.4,
          },
          {
            id: "sp-1",
            kind: "spotlight",
            cutoutRect: { x: 20, y: 20, width: 60, height: 40 },
            dimOpacity: 0.5,
          },
          {
            id: "mg-1",
            kind: "magnifier",
            center: { x: 100, y: 75 },
            radius: 25,
            zoom: 2,
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      validateEmphasisOptions({
        source: dummySource,
        width: 200,
        height: 150,
        effects: [
          {
            id: "bad-rect",
            kind: "highlight",
            rect: { x: 180, y: 10, width: 50, height: 30 },
            color: "#facc15",
            opacity: 0.4,
          },
        ],
      }),
    ).toThrow(/highlight/i);

    expect(() =>
      validateEmphasisOptions({
        source: dummySource,
        width: 200,
        height: 150,
        effects: [
          {
            id: "bad-zoom",
            kind: "magnifier",
            center: { x: 50, y: 50 },
            radius: 20,
            zoom: 0.5,
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        ],
      }),
    ).toThrow(/zoom/i);

    expect(EMPHASIS_CONTRACT_PROPOSAL.proposedTools).toEqual([
      "highlight",
      "spotlight",
      "magnifier",
    ]);
  });
});

