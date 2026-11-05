import { describe, expect, it } from "vitest";
import {
  snapPlacementToEdges,
  sortLayersByZOrder,
  validateCompositionOptions,
  type PlacedImageLayer,
} from "./composition";

describe("multi-image composition model & snapping (A21)", () => {
  it("snaps candidate edges deterministically to peer and canvas edges and preserves stable z-order sorting", () => {
    const snapped = snapPlacementToEdges(
      { x: 104, y: 5, width: 80, height: 60 },
      [{ x: 20, y: 20, width: 80, height: 60 }], // right edge at x=100
      400,
      300,
      8,
    );

    expect(snapped).toEqual({
      x: 100,
      y: 0,
      snappedX: true,
      snappedY: true,
    });

    const dummySource = {} as CanvasImageSource;
    const layers: readonly PlacedImageLayer[] = Object.freeze([
      {
        id: "top",
        source: dummySource,
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        zIndex: 10,
      },
      {
        id: "bottom-a",
        source: dummySource,
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        zIndex: 1,
      },
      {
        id: "bottom-b",
        source: dummySource,
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        zIndex: 1,
      },
    ]);

    const sorted = sortLayersByZOrder(layers);
    expect(sorted.map((l) => l.id)).toEqual(["bottom-a", "bottom-b", "top"]);
  });

  it("rejects out-of-bounds placements and empty layer lists", () => {
    const dummySource = {} as CanvasImageSource;

    expect(() =>
      validateCompositionOptions({
        canvasWidth: 200,
        canvasHeight: 200,
        layers: [],
      }),
    ).toThrow(/between 1 and/i);

    expect(() =>
      validateCompositionOptions({
        canvasWidth: 200,
        canvasHeight: 200,
        layers: [
          {
            id: "overflow",
            source: dummySource,
            x: 160,
            y: 20,
            width: 60,
            height: 40,
            zIndex: 0,
          },
        ],
      }),
    ).toThrow(/out of canvas bounds/i);
  });
});

