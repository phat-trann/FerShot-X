import { expect, test } from "@playwright/test";

test.describe("A18 highlight, spotlight, and magnifier renderer (real browser pixels)", () => {
  test("renders highlight tint, spotlight dimming outside cutout, and clipped magnifier zoom onto a new PNG Blob while preserving source", async ({
    page,
  }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const mod = await import("/src/features/emphasis/index.ts");

      const width = 120;
      const height = 80;
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = width;
      srcCanvas.height = height;
      const srcCtx = srcCanvas.getContext("2d")!;
      // Fill background with pure white (255, 255, 255, 255)
      srcCtx.fillStyle = "#ffffff";
      srcCtx.fillRect(0, 0, width, height);
      // Draw a small 4x4 pure red target at (88..92, 38..42) centered at (90, 40)
      srcCtx.fillStyle = "#ff0000";
      srcCtx.fillRect(88, 38, 4, 4);

      const beforePixel = Array.from(srcCtx.getImageData(10, 10, 1, 1).data);

      const effects = Object.freeze([
        Object.freeze({
          id: "sp-1",
          kind: "spotlight" as const,
          cutoutRect: Object.freeze({ x: 20, y: 10, width: 90, height: 60 }),
          dimOpacity: 0.5,
        }),
        Object.freeze({
          id: "hl-1",
          kind: "highlight" as const,
          rect: Object.freeze({ x: 25, y: 15, width: 30, height: 25 }),
          color: "#ffff00",
          opacity: 0.5,
        }),
        Object.freeze({
          id: "mg-1",
          kind: "magnifier" as const,
          center: Object.freeze({ x: 90, y: 40 }),
          radius: 16,
          zoom: 4,
          borderColor: "#0000ff",
          borderWidth: 2,
        }),
      ]);

      const blob = await mod.renderEmphasisToPngBlob({
        source: srcCanvas,
        width,
        height,
        effects,
      });

      const bitmap = await createImageBitmap(blob);
      const inspectCanvas = document.createElement("canvas");
      inspectCanvas.width = bitmap.width;
      inspectCanvas.height = bitmap.height;
      const inspectCtx = inspectCanvas.getContext("2d")!;
      inspectCtx.drawImage(bitmap, 0, 0);

      const sample = (x: number, y: number) =>
        Array.from(inspectCtx.getImageData(x, y, 1, 1).data);

      const afterSourcePixel = Array.from(
        srcCtx.getImageData(10, 10, 1, 1).data,
      );

      let rejectedInvalid = false;
      try {
        await mod.renderEmphasisToPngBlob({
          source: srcCanvas,
          width,
          height,
          effects: [
            {
              id: "invalid",
              kind: "magnifier",
              center: { x: 999, y: 999 },
              radius: 20,
              zoom: 2,
              borderColor: "#000000",
              borderWidth: 2,
            },
          ],
        });
      } catch {
        rejectedInvalid = true;
      }

      return {
        mime: blob.type,
        outWidth: bitmap.width,
        outHeight: bitmap.height,
        beforePixel,
        afterSourcePixel,
        dimmedOutsideCutout: sample(5, 5),
        untouchedInsideCutout: sample(65, 20),
        highlightedPixel: sample(35, 25),
        magnifiedRedPixel: sample(95, 40),
        outsideLensRedCheck: sample(108, 40),
        rejectedInvalid,
      };
    });

    expect(result.mime).toBe("image/png");
    expect(result.outWidth).toBe(120);
    expect(result.outHeight).toBe(80);
    // Source canvas preserved unchanged
    expect(result.afterSourcePixel).toEqual(result.beforePixel);
    // Outside spotlight cutout (5, 5) is dimmed gray (< 160)
    expect(result.dimmedOutsideCutout[0]).toBeLessThan(160);
    // Untouched pixel inside spotlight cutout (65, 20) stays pure white
    expect(result.untouchedInsideCutout).toEqual([255, 255, 255, 255]);
    // Highlighted yellow tint pixel (35, 25) has high R & G and reduced B
    expect(result.highlightedPixel[0]).toBeGreaterThan(240);
    expect(result.highlightedPixel[1]).toBeGreaterThan(240);
    expect(result.highlightedPixel[2]).toBeLessThan(160);
    // Magnifier 4x zoom expands the 4x4 red square (radius 2 -> radius 8 around x=90), so (95, 40) is red!
    expect(result.magnifiedRedPixel[0]).toBeGreaterThan(200);
    expect(result.magnifiedRedPixel[1]).toBeLessThan(40);
    // Outside the clipped lens (110, 40) remains white
    expect(result.outsideLensRedCheck).toEqual([255, 255, 255, 255]);
    expect(result.rejectedInvalid).toBe(true);
  });
});
