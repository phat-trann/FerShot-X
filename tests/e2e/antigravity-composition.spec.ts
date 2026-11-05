import { expect, test } from "@playwright/test";

test.describe("A21 multi-image composition (real browser pixels)", () => {
  test("composites overlapping layers in explicit z-order, preserves sources, and respects AbortSignal cancellation", async ({
    page,
  }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const mod = await import("/src/features/composition/index.ts");

      const makeSolidCanvas = (w: number, h: number, color: string) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
        return { canvas: c, ctx };
      };

      const red = makeSolidCanvas(60, 60, "#ff0000");
      const blue = makeSolidCanvas(60, 60, "#0000ff");

      const beforeRed = Array.from(red.ctx.getImageData(0, 0, 1, 1).data);
      const beforeBlue = Array.from(blue.ctx.getImageData(0, 0, 1, 1).data);

      const placedOrder: string[] = [];

      // Pass red (zIndex: 5) BEFORE blue (zIndex: 1); z-order sorting must draw blue first, then red on top in overlap (30..60, 30..60)
      const blob = await mod.renderCompositionToPngBlob({
        canvasWidth: 100,
        canvasHeight: 100,
        backgroundColor: "#ffffff",
        onLayerPlaced: (id: string) => placedOrder.push(id),
        layers: Object.freeze([
          Object.freeze({
            id: "layer-red-top",
            source: red.canvas,
            x: 30,
            y: 30,
            width: 60,
            height: 60,
            zIndex: 5,
          }),
          Object.freeze({
            id: "layer-blue-bottom",
            source: blue.canvas,
            x: 0,
            y: 0,
            width: 60,
            height: 60,
            zIndex: 1,
          }),
        ]),
      });

      const bitmap = await createImageBitmap(blob);
      const inspectCanvas = document.createElement("canvas");
      inspectCanvas.width = bitmap.width;
      inspectCanvas.height = bitmap.height;
      const inspectCtx = inspectCanvas.getContext("2d")!;
      inspectCtx.drawImage(bitmap, 0, 0);

      const sample = (x: number, y: number) =>
        Array.from(inspectCtx.getImageData(x, y, 1, 1).data);

      const afterRed = Array.from(red.ctx.getImageData(0, 0, 1, 1).data);
      const afterBlue = Array.from(blue.ctx.getImageData(0, 0, 1, 1).data);

      // Verify AbortSignal cancellation
      const abortController = new AbortController();
      abortController.abort();
      let cancelledRejected = false;
      try {
        await mod.renderCompositionToPngBlob({
          canvasWidth: 100,
          canvasHeight: 100,
          signal: abortController.signal,
          layers: [
            {
              id: "layer-1",
              source: red.canvas,
              x: 0,
              y: 0,
              width: 60,
              height: 60,
              zIndex: 1,
            },
          ],
        });
      } catch {
        cancelledRejected = true;
      }

      return {
        placedOrder,
        beforeRed,
        afterRed,
        beforeBlue,
        afterBlue,
        blueOnlyPixel: sample(10, 10),
        overlapPixel: sample(45, 45),
        redOnlyPixel: sample(75, 75),
        backgroundPixel: sample(95, 10),
        cancelledRejected,
      };
    });

    expect(result.placedOrder).toEqual(["layer-blue-bottom", "layer-red-top"]);
    expect(result.afterRed).toEqual(result.beforeRed);
    expect(result.afterBlue).toEqual(result.beforeBlue);
    expect(result.blueOnlyPixel).toEqual([0, 0, 255, 255]);
    expect(result.overlapPixel).toEqual([255, 0, 0, 255]);
    expect(result.redOnlyPixel).toEqual([255, 0, 0, 255]);
    expect(result.backgroundPixel).toEqual([255, 255, 255, 255]);
    expect(result.cancelledRejected).toBe(true);
  });
});

