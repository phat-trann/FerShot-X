import { expect, test } from "@playwright/test";

test.describe("A08 annotation bitmap renderer (real browser pixels)", () => {
  test("renders rectangle, arrow with visible head, and pen strokes with alpha onto a new PNG Blob while preserving source and rejecting unsupported tools", async ({
    page,
  }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const mod = await import("/src/features/editor/render/index.ts");

      const width = 120;
      const height = 100;

      // Create a pure solid dark-blue source canvas and capture its original pixel snapshot
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = width;
      srcCanvas.height = height;
      const srcCtx = srcCanvas.getContext("2d")!;
      srcCtx.fillStyle = "rgb(10, 20, 40)";
      srcCtx.fillRect(0, 0, width, height);
      const beforeSourcePixels = Array.from(
        srcCtx.getImageData(0, 0, width, height).data,
      );

      const sourceBlob = await new Promise<Blob>((resolve, reject) => {
        srcCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("source blob failed"))),
          "image/png",
        );
      });

      const annotations = Object.freeze([
        Object.freeze({
          id: "rect-1",
          tool: "rectangle" as const,
          points: Object.freeze([
            Object.freeze({ x: 10, y: 10 }),
            Object.freeze({ x: 50, y: 40 }),
          ]),
          style: Object.freeze({
            color: "#ff0000",
            strokeWidth: 4,
            opacity: 1,
          }),
        }),
        Object.freeze({
          id: "arrow-1",
          tool: "arrow" as const,
          points: Object.freeze([
            Object.freeze({ x: 20, y: 60 }),
            Object.freeze({ x: 100, y: 60 }),
          ]),
          style: Object.freeze({
            color: "#00ff00",
            strokeWidth: 4,
            opacity: 1,
          }),
        }),
        Object.freeze({
          id: "pen-1",
          tool: "pen" as const,
          points: Object.freeze([
            Object.freeze({ x: 15, y: 85 }),
            Object.freeze({ x: 60, y: 85 }),
            Object.freeze({ x: 95, y: 85 }),
          ]),
          style: Object.freeze({
            color: "#ffffff",
            strokeWidth: 6,
            opacity: 0.5,
          }),
        }),
      ]);

      const outputBlob = await mod.renderAnnotationsToPngBlob({
        source: sourceBlob,
        width,
        height,
        annotations,
      });

      // Verify source canvas was not mutated
      const afterSourcePixels = Array.from(
        srcCtx.getImageData(0, 0, width, height).data,
      );
      const sourceUnchanged =
        beforeSourcePixels.length === afterSourcePixels.length &&
        beforeSourcePixels.every((val, idx) => val === afterSourcePixels[idx]);

      // Decode the returned PNG Blob in the browser to inspect actual rendered pixels
      const outBitmap = await createImageBitmap(outputBlob);
      const checkCanvas = document.createElement("canvas");
      checkCanvas.width = outBitmap.width;
      checkCanvas.height = outBitmap.height;
      const checkCtx = checkCanvas.getContext("2d")!;
      checkCtx.drawImage(outBitmap, 0, 0);
      outBitmap.close();

      const pixelAt = (x: number, y: number) => {
        const d = checkCtx.getImageData(x, y, 1, 1).data;
        return [d[0], d[1], d[2], d[3]];
      };

      // 1. Background untouched pixel at (5, 5)
      const bgPixel = pixelAt(5, 5);
      // 2. Rectangle top border at (30, 10) -> pure red (#ff0000)
      const rectBorderPixel = pixelAt(30, 10);
      // 3. Arrow shaft at (50, 60) -> pure green (#00ff00)
      const arrowShaftPixel = pixelAt(50, 60);
      // 4. Arrowhead wing off-shaft at (92, 56) -> green arrowhead polygon pixel
      const arrowHeadWingPixel = pixelAt(92, 56);
      // 5. Semi-transparent white pen stroke at (50, 85) blended over rgb(10, 20, 40)
      const penBlendedPixel = pixelAt(50, 85);

      // Verify unsupported tool rejection (e.g. blur)
      let blurRejected = false;
      try {
        await mod.renderAnnotationsToPngBlob({
          source: sourceBlob,
          width,
          height,
          annotations: [
            {
              id: "unsupported-blur",
              tool: "blur",
              points: [
                { x: 10, y: 10 },
                { x: 30, y: 30 },
              ],
              style: { color: "#000000", strokeWidth: 4, opacity: 1 },
            },
          ],
        });
      } catch (err) {
        blurRejected =
          err instanceof RangeError && /unsupported annotation tool/i.test(err.message);
      }

      return {
        mimeType: outputBlob.type,
        outWidth: checkCanvas.width,
        outHeight: checkCanvas.height,
        sourceUnchanged,
        bgPixel,
        rectBorderPixel,
        arrowShaftPixel,
        arrowHeadWingPixel,
        penBlendedPixel,
        blurRejected,
      };
    });

    expect(result.mimeType).toBe("image/png");
    expect(result.outWidth).toBe(120);
    expect(result.outHeight).toBe(100);
    expect(result.sourceUnchanged).toBe(true);

    // Unmodified background pixel
    expect(result.bgPixel).toEqual([10, 20, 40, 255]);

    // Red rectangle border pixel
    expect(result.rectBorderPixel[0]).toBeGreaterThan(220);
    expect(result.rectBorderPixel[1]).toBeLessThan(30);
    expect(result.rectBorderPixel[2]).toBeLessThan(30);

    // Green arrow shaft pixel
    expect(result.arrowShaftPixel[1]).toBeGreaterThan(220);
    expect(result.arrowShaftPixel[0]).toBeLessThan(30);

    // Visible green arrowhead wing pixel off the y=60 shaft line
    expect(result.arrowHeadWingPixel[1]).toBeGreaterThan(150);
    expect(result.arrowHeadWingPixel[0]).toBeLessThan(30);

    // Alpha-blended white pen stroke over dark blue (intermediate RGB values, not 10/20/40 and not 255/255/255)
    expect(result.penBlendedPixel[0]).toBeGreaterThan(100);
    expect(result.penBlendedPixel[0]).toBeLessThan(200);
    expect(result.penBlendedPixel[2]).toBeGreaterThan(110);
    expect(result.penBlendedPixel[2]).toBeLessThan(210);

    // Blur/redaction is explicitly rejected
    expect(result.blurRejected).toBe(true);
  });
});

