import { describe, expect, it } from "vitest";
import { applyAutoAdjustToRgbaBuffer } from "./auto-adjust";

describe("auto-adjust (A31)", () => {
  it("stretches low-contrast gradients deterministically, preserves flat and transparent pixels, and leaves source buffer immutable", () => {
    // 4x1 gradient with narrow mid-range values [80, 100, 120, 140] and varied alpha
    const source = new Uint8ClampedArray([
      80, 80, 80, 255,
      100, 100, 100, 200,
      120, 120, 120, 128,
      140, 140, 140, 0, // transparent pixel ignored in histogram and preserved
    ]);
    const snapshot = new Uint8ClampedArray(source);

    const adjusted = applyAutoAdjustToRgbaBuffer(source, 4, 1, {
      enabled: true,
      strength: 1,
      lowPercentile: 0.01,
      highPercentile: 0.99,
    });

    // Source unchanged
    expect(Array.from(source)).toEqual(Array.from(snapshot));
    // Darkest visible pixel (80) stretched to 0; brightest visible pixel (120) stretched to 255
    expect(adjusted.data[0]).toBe(0);
    expect(adjusted.data[8]).toBe(255);
    // Alpha values preserved exactly
    expect(adjusted.data[3]).toBe(255);
    expect(adjusted.data[7]).toBe(200);
    expect(adjusted.data[11]).toBe(128);
    expect(adjusted.data[15]).toBe(0);

    // Reset (enabled: false) produces exact copy of source
    const reset = applyAutoAdjustToRgbaBuffer(source, 4, 1, {
      enabled: false,
    });
    expect(Array.from(reset.data)).toEqual(Array.from(source));

    // Flat image is bypassed cleanly
    const flat = new Uint8ClampedArray([
      110, 110, 110, 255,
      110, 110, 110, 255,
    ]);
    const flatResult = applyAutoAdjustToRgbaBuffer(flat, 2, 1);
    expect(flatResult.stats.isFlatOrBypassed).toBe(true);
    expect(Array.from(flatResult.data)).toEqual(Array.from(flat));
  });
});

