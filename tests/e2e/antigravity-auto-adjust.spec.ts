import { expect, test } from "@playwright/test";

test.describe("A31 non-destructive automatic image adjustment (real browser)", () => {
  test("adjusts gradient contrast, preserves flat fixtures and alpha channel, enforces bounds, and restores exact original on reset", async ({
    page,
  }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const mod = await import("/src/features/auto-adjust/index.ts");

      // 1. Gradient canvas (40x10): left half dark grey (70), right half light grey (150), with alpha=180
      const gradCanvas = document.createElement("canvas");
      gradCanvas.width = 40;
      gradCanvas.height = 10;
      const gCtx = gradCanvas.getContext("2d")!;
      const raw = gCtx.createImageData(40, 10);
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 40; x++) {
          const idx = (y * 40 + x) * 4;
          const v = x < 20 ? 70 : 150;
          raw.data[idx] = v;
          raw.data[idx + 1] = v;
          raw.data[idx + 2] = v;
          raw.data[idx + 3] = 180;
        }
      }
      gCtx.putImageData(raw, 0, 0);
      const beforeLeft = Array.from(gCtx.getImageData(5, 5, 1, 1).data);
      const beforeRight = Array.from(gCtx.getImageData(35, 5, 1, 1).data);

      const adjusted = mod.renderAutoAdjustedCanvas({
        source: gradCanvas,
        width: 40,
        height: 10,
        options: { enabled: true, strength: 1 },
      });
      const adjCtx = adjusted.canvas.getContext("2d")!;
      const adjLeft = Array.from(adjCtx.getImageData(5, 5, 1, 1).data);
      const adjRight = Array.from(adjCtx.getImageData(35, 5, 1, 1).data);

      // Reset canvas must equal original source
      const resetCanvas = mod.resetAutoAdjustedCanvas({
        source: gradCanvas,
        width: 40,
        height: 10,
      });
      const resetCtx = resetCanvas.getContext("2d")!;
      const resetLeft = Array.from(resetCtx.getImageData(5, 5, 1, 1).data);
      const resetRight = Array.from(resetCtx.getImageData(35, 5, 1, 1).data);

      // Source canvas untouched
      const afterSourceLeft = Array.from(gCtx.getImageData(5, 5, 1, 1).data);

      // 2. Flat canvas (20x10 uniform rgb(123,123,123))
      const flatCanvas = document.createElement("canvas");
      flatCanvas.width = 20;
      flatCanvas.height = 10;
      const fCtx = flatCanvas.getContext("2d")!;
      fCtx.fillStyle = "rgb(123, 123, 123)";
      fCtx.fillRect(0, 0, 20, 10);
      const flatOut = mod.renderAutoAdjustedCanvas({
        source: flatCanvas,
        width: 20,
        height: 10,
      });
      const flatPixel = Array.from(
        flatOut.canvas.getContext("2d")!.getImageData(5, 5, 1, 1).data,
      );

      let rejectedOversize = false;
      try {
        mod.renderAutoAdjustedCanvas({
          source: flatCanvas,
          width: 8192,
          height: 8192,
        });
      } catch {
        rejectedOversize = true;
      }

      return {
        beforeLeft,
        beforeRight,
        adjLeft,
        adjRight,
        resetLeft,
        resetRight,
        afterSourceLeft,
        flatIsBypassed: flatOut.stats.isFlatOrBypassed,
        flatPixel,
        rejectedOversize,
      };
    });

    // Source unchanged
    expect(result.afterSourceLeft).toEqual(result.beforeLeft);
    // Adjusted expands tonal range to [0, 255] while preserving alpha=180
    expect(result.adjLeft).toEqual([0, 0, 0, 180]);
    expect(result.adjRight).toEqual([255, 255, 255, 180]);
    // Reset restores original pixels
    expect(result.resetLeft).toEqual(result.beforeLeft);
    expect(result.resetRight).toEqual(result.beforeRight);
    // Flat fixture bypassed without distortion
    expect(result.flatIsBypassed).toBe(true);
    expect(result.flatPixel).toEqual([123, 123, 123, 255]);
    expect(result.rejectedOversize).toBe(true);
  });
});

