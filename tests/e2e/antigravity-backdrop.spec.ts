import { expect, test } from "@playwright/test";

test.describe("A20 backdrop composition renderer (real browser pixels)", () => {
  test("renders inset, aspect-ratio expansion, rounded-corner clipping, and gradient/solid fills while preserving source", async ({
    page,
  }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const mod = await import("/src/features/backdrop/index.ts");

      const srcW = 60;
      const srcH = 40;
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = srcW;
      srcCanvas.height = srcH;
      const srcCtx = srcCanvas.getContext("2d")!;
      // Pure green foreground image
      srcCtx.fillStyle = "#00ff00";
      srcCtx.fillRect(0, 0, srcW, srcH);

      const beforeSourceCorner = Array.from(
        srcCtx.getImageData(0, 0, 1, 1).data,
      );

      // Base with inset=20 is 100x80; aspectRatio=2 expands width to 160x80, so drawX=50, drawY=20
      const blob = await mod.renderBackdropToPngBlob({
        source: srcCanvas,
        sourceWidth: srcW,
        sourceHeight: srcH,
        inset: 20,
        cornerRadius: 16,
        aspectRatio: 2,
        recenter: true,
        fill: {
          kind: "linear-gradient",
          startColor: "#ff0000",
          endColor: "#0000ff",
          angleDeg: 0,
        },
        shadow: {
          blur: 4,
          offsetX: 0,
          offsetY: 2,
          color: "#000000",
        },
      });

      const bitmap = await createImageBitmap(blob);
      const outCanvas = document.createElement("canvas");
      outCanvas.width = bitmap.width;
      outCanvas.height = bitmap.height;
      const outCtx = outCanvas.getContext("2d")!;
      outCtx.drawImage(bitmap, 0, 0);

      const sample = (x: number, y: number) =>
        Array.from(outCtx.getImageData(x, y, 1, 1).data);

      const afterSourceCorner = Array.from(
        srcCtx.getImageData(0, 0, 1, 1).data,
      );

      let rejectedInvalid = false;
      try {
        await mod.renderBackdropToPngBlob({
          source: srcCanvas,
          sourceWidth: srcW,
          sourceHeight: srcH,
          inset: 20,
          cornerRadius: 8,
          fill: { kind: "solid", color: "invalid-color" },
        });
      } catch {
        rejectedInvalid = true;
      }

      return {
        outWidth: bitmap.width,
        outHeight: bitmap.height,
        beforeSourceCorner,
        afterSourceCorner,
        leftBackdropPixel: sample(5, 40),
        rightBackdropPixel: sample(155, 40),
        centerForegroundPixel: sample(80, 40),
        clippedCardCornerPixel: sample(50, 20),
        rejectedInvalid,
      };
    });

    expect(result.outWidth).toBe(160);
    expect(result.outHeight).toBe(80);
    // Source canvas remains untouched pure green
    expect(result.afterSourceCorner).toEqual(result.beforeSourceCorner);
    // Center of foreground card (80, 40) is pure green
    expect(result.centerForegroundPixel).toEqual([0, 255, 0, 255]);
    // Left backdrop (5, 40) is red-dominant from linear gradient startColor
    expect(result.leftBackdropPixel[0]).toBeGreaterThan(180);
    expect(result.leftBackdropPixel[1]).toBe(0);
    // Right backdrop (155, 40) is blue-dominant from linear gradient endColor
    expect(result.rightBackdropPixel[2]).toBeGreaterThan(180);
    expect(result.rightBackdropPixel[1]).toBe(0);
    // Top-left card corner (50, 20) is clipped by cornerRadius=16 so it shows backdrop/shadow, NOT green (G < 50)
    expect(result.clippedCardCornerPixel[1]).toBeLessThan(50);
    expect(result.rejectedInvalid).toBe(true);
  });
});

