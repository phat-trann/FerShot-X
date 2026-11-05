import { expect, test } from "@playwright/test";

test.describe("A36 composed image layout workspace (real browser pixels)", () => {
  test("composes window shadow-trim, z-ordered multi-image layers, transparent inputs, backdrop inset, explicit displayScale PX/PT summary, and oversize rejection", async ({
    page,
  }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const mod = await import("/src/features/layout-workspace/index.ts");

      // Bottom layer (zIndex: 1): 80x60 window with 10px shadow margin trimmed -> 60x40 red (#ff0000)
      const winCanvas = document.createElement("canvas");
      winCanvas.width = 80;
      winCanvas.height = 60;
      const wCtx = winCanvas.getContext("2d")!;
      wCtx.clearRect(0, 0, 80, 60);
      wCtx.fillStyle = "#ff0000";
      wCtx.fillRect(10, 10, 60, 40);

      // Top layer (zIndex: 5): 30x30 green (#00ff00) placed overlapping at (20, 10)
      const topCanvas = document.createElement("canvas");
      topCanvas.width = 30;
      topCanvas.height = 30;
      const tCtx = topCanvas.getContext("2d")!;
      tCtx.fillStyle = "#00ff00";
      tCtx.fillRect(0, 0, 30, 30);

      // 1. Transparent composition without backdrop (100x60 at 2x scale -> 50x30 pt)
      const transparentRun = await mod.renderLayoutWorkspaceToPngBlob({
        canvasWidth: 100,
        canvasHeight: 60,
        displayScale: 2,
        backgroundColor: null,
        layers: [
          {
            id: "top-green",
            source: topCanvas,
            x: 20,
            y: 10,
            width: 30,
            height: 30,
            zIndex: 5,
          },
          {
            id: "bottom-red-window",
            source: winCanvas,
            x: 0,
            y: 0,
            width: 60,
            height: 40,
            zIndex: 1,
            windowAppearance: {
              sourceWidth: 80,
              sourceHeight: 60,
              background: { kind: "transparent" },
              shadowTrim: { top: 10, right: 10, bottom: 10, left: 10 },
            },
          },
        ],
        backdrop: null,
      });

      const tBmp = await createImageBitmap(transparentRun.blob);
      const tOut = document.createElement("canvas");
      tOut.width = tBmp.width;
      tOut.height = tBmp.height;
      const tOutCtx = tOut.getContext("2d")!;
      tOutCtx.drawImage(tBmp, 0, 0);

      // 2. Same layers with blue (#0000ff) solid backdrop and inset=10 -> 120x80 px
      const backdropRun = await mod.renderLayoutWorkspaceToPngBlob({
        canvasWidth: 100,
        canvasHeight: 60,
        displayScale: 2,
        backgroundColor: null,
        layers: [
          {
            id: "bottom-red-window",
            source: winCanvas,
            x: 0,
            y: 0,
            width: 60,
            height: 40,
            zIndex: 1,
            windowAppearance: {
              sourceWidth: 80,
              sourceHeight: 60,
              background: { kind: "transparent" },
              shadowTrim: { top: 10, right: 10, bottom: 10, left: 10 },
            },
          },
        ],
        backdrop: {
          inset: 10,
          cornerRadius: 0,
          fill: { kind: "solid", color: "#0000ff" },
        },
      });
      const bBmp = await createImageBitmap(backdropRun.blob);
      const bOut = document.createElement("canvas");
      bOut.width = bBmp.width;
      bOut.height = bBmp.height;
      const bOutCtx = bOut.getContext("2d")!;
      bOutCtx.drawImage(bBmp, 0, 0);

      let rejectedOversize = false;
      try {
        await mod.renderLayoutWorkspaceToPngBlob({
          canvasWidth: 16385,
          canvasHeight: 100,
          displayScale: 1,
          layers: [
            {
              id: "l1",
              source: topCanvas,
              x: 0,
              y: 0,
              width: 30,
              height: 30,
              zIndex: 1,
            },
          ],
        });
      } catch {
        rejectedOversize = true;
      }

      return {
        transparentWidthPx: tBmp.width,
        transparentHeightPx: tBmp.height,
        transparentFormattedPt:
          transparentRun.summary.outputMeasurement.formattedPt,
        orderedIds: transparentRun.summary.orderedLayerIds,
        redOnlyPixel: Array.from(tOutCtx.getImageData(5, 5, 1, 1).data),
        overlapGreenPixel: Array.from(tOutCtx.getImageData(30, 20, 1, 1).data),
        unoccupiedTransparentPixel: Array.from(
          tOutCtx.getImageData(90, 50, 1, 1).data,
        ),
        backdropWidthPx: bBmp.width,
        backdropHeightPx: bBmp.height,
        backdropMarginBluePixel: Array.from(
          bOutCtx.getImageData(2, 2, 1, 1).data,
        ),
        rejectedOversize,
      };
    });

    expect(result.transparentWidthPx).toBe(100);
    expect(result.transparentHeightPx).toBe(60);
    expect(result.transparentFormattedPt).toBe("50 × 30 pt");
    expect(result.orderedIds).toEqual(["bottom-red-window", "top-green"]);
    expect(result.redOnlyPixel).toEqual([255, 0, 0, 255]);
    expect(result.overlapGreenPixel).toEqual([0, 255, 0, 255]);
    expect(result.unoccupiedTransparentPixel).toEqual([0, 0, 0, 0]);
    expect(result.backdropWidthPx).toBe(120);
    expect(result.backdropHeightPx).toBe(80);
    expect(result.backdropMarginBluePixel).toEqual([0, 0, 255, 255]);
    expect(result.rejectedOversize).toBe(true);
  });
});

