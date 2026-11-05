import { expect, test } from "@playwright/test";

test.describe("A30 local output and print presentation (real browser)", () => {
  test("renders synthetic print-sheet page dimensions, preserves image aspect ratio, enforces drag MIME boundaries, and never invokes window.print automatically", async ({
    page,
  }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      let windowPrintCount = 0;
      window.print = () => {
        windowPrintCount += 1;
      };

      const mod = await import("/src/features/local-output/index.ts");

      // Create 200x100 pure green synthetic image (aspect ratio 2:1)
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = 200;
      srcCanvas.height = 100;
      const srcCtx = srcCanvas.getContext("2d")!;
      srcCtx.fillStyle = "#00ff00";
      srcCtx.fillRect(0, 0, 200, 100);

      const layout = mod.computePrintSheetLayout({
        imageWidth: 200,
        imageHeight: 100,
        paper: "letter",
        orientation: "portrait",
        marginPt: 36,
        scaleMode: "fit",
      });

      const sheetCanvas = mod.renderPrintSheetPreviewToCanvas({
        source: srcCanvas,
        imageWidth: 200,
        imageHeight: 100,
        paper: "letter",
        orientation: "portrait",
        marginPt: 36,
        scaleMode: "fit",
      });
      const sheetCtx = sheetCanvas.getContext("2d")!;

      const validPayload = mod.createDragImagePayload({
        id: "img-1",
        name: "capture../01",
        src: srcCanvas.toDataURL("image/png"),
        width: 200,
        height: 100,
        mimeType: "image/png",
        byteSize: 1024,
      });

      let rejectedHtmlMime = false;
      try {
        mod.createDragImagePayload({
          id: "img-2",
          name: "bad",
          src: "data:text/html;base64,PHNjcmlwdD4=",
          width: 200,
          height: 100,
          mimeType: "text/html",
          byteSize: 64,
        });
      } catch {
        rejectedHtmlMime = true;
      }

      const marginPixel = Array.from(sheetCtx.getImageData(10, 10, 1, 1).data);
      const centerPixel = Array.from(
        sheetCtx.getImageData(
          Math.floor(layout.pageWidthPt / 2),
          Math.floor(layout.pageHeightPt / 2),
          1,
          1,
        ).data,
      );

      return {
        windowPrintCount,
        sheetWidth: sheetCanvas.width,
        sheetHeight: sheetCanvas.height,
        drawWidthPt: layout.drawWidthPt,
        drawHeightPt: layout.drawHeightPt,
        marginPixel,
        centerPixel,
        validFileName: validPayload.fileName,
        validMimeType: validPayload.mimeType,
        rejectedHtmlMime,
      };
    });

    expect(result.windowPrintCount).toBe(0);
    expect(result.sheetWidth).toBe(612);
    expect(result.sheetHeight).toBe(792);
    expect(result.drawWidthPt / result.drawHeightPt).toBeCloseTo(2, 2);
    expect(result.marginPixel).toEqual([255, 255, 255, 255]);
    expect(result.centerPixel).toEqual([0, 255, 0, 255]);
    expect(result.validFileName).toBe("capture-01.png");
    expect(result.validMimeType).toBe("image/png");
    expect(result.rejectedHtmlMime).toBe(true);
  });
});

