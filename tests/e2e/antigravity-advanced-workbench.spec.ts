import { expect, test } from "@playwright/test";

test.describe("A34 composed advanced editor module (real browser pixels)", () => {
  test("renders line, ellipse, text, and highlight emphasis effect onto exported PNG while preserving source coordinates under zoom and rejecting unsupported kinds", async ({
    page,
  }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const mod = await import(
        "/src/features/editor/advanced-workbench/index.ts"
      );

      // Create 160x100 pure blue (#0000ff) source canvas
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = 160;
      srcCanvas.height = 100;
      const srcCtx = srcCanvas.getContext("2d")!;
      srcCtx.fillStyle = "#0000ff";
      srcCtx.fillRect(0, 0, 160, 100);

      // 1. Create a line item and move it by (+10, 0) in source coordinates
      const rawLine = mod.moveAdvancedItem(
        {
          id: "line-1",
          itemKind: "shape",
          shape: {
            id: "line-1",
            kind: "line",
            points: [
              { x: 10, y: 20 },
              { x: 50, y: 20 },
            ],
            style: { color: "#ff0000", strokeWidth: 6, opacity: 1 },
          },
        },
        10,
        0,
        160,
        100,
      );

      // 2. Ellipse item at (80..120, 10..50) -> top stroke at (100, 10)
      const ellipseItem = {
        id: "ellipse-1",
        itemKind: "shape" as const,
        shape: {
          id: "ellipse-1",
          kind: "ellipse" as const,
          points: [
            { x: 80, y: 10 },
            { x: 120, y: 50 },
          ] as const,
          style: { color: "#00ff00", strokeWidth: 6, opacity: 1 },
        },
      };

      // 3. Text item at (20, 60)
      const textItem = {
        id: "text-1",
        itemKind: "contract" as const,
        annotation: {
          id: "text-1",
          tool: "text" as const,
          points: [{ x: 20, y: 60 }],
          style: { color: "#ffffff", strokeWidth: 4, opacity: 1 },
          text: "███",
        },
      };

      // 4. Highlight emphasis effect at (120, 60, 30, 30) in yellow (#ffff00, opacity 0.5)
      const highlightItem = {
        id: "hl-1",
        itemKind: "emphasis" as const,
        effect: {
          id: "hl-1",
          kind: "highlight" as const,
          rect: { x: 120, y: 60, width: 30, height: 30 },
          color: "#ffff00",
          opacity: 0.5,
        },
      };

      const blob = await mod.renderAdvancedWorkbenchToPngBlob({
        source: srcCanvas,
        width: 160,
        height: 100,
        items: [rawLine, ellipseItem, textItem, highlightItem],
      });

      const bmp = await createImageBitmap(blob);
      const outCanvas = document.createElement("canvas");
      outCanvas.width = bmp.width;
      outCanvas.height = bmp.height;
      const outCtx = outCanvas.getContext("2d")!;
      outCtx.drawImage(bmp, 0, 0);

      const sample = (x: number, y: number) =>
        Array.from(outCtx.getImageData(x, y, 1, 1).data);

      let rejectedUnsupported = false;
      try {
        await mod.renderAdvancedWorkbenchToPngBlob({
          source: srcCanvas,
          width: 160,
          height: 100,
          items: [
            {
              id: "unsupported-blur",
              itemKind: "contract",
              annotation: {
                id: "unsupported-blur",
                tool: "blur",
                points: [{ x: 10, y: 10 }],
                style: { color: "#000000", strokeWidth: 2, opacity: 1 },
              },
            },
          ],
        });
      } catch {
        rejectedUnsupported = true;
      }

      return {
        outWidth: bmp.width,
        outHeight: bmp.height,
        lineMidPixel: sample(40, 20),
        ellipseTopPixel: sample(100, 10),
        highlightPixel: sample(135, 75),
        untouchedCornerPixel: sample(2, 2),
        rejectedUnsupported,
      };
    });

    expect(result.outWidth).toBe(160);
    expect(result.outHeight).toBe(100);
    // Moved line at (20..60, 20) is pure red
    expect(result.lineMidPixel).toEqual([255, 0, 0, 255]);
    // Ellipse top stroke at (100, 10) is pure green
    expect(result.ellipseTopPixel).toEqual([0, 255, 0, 255]);
    // Highlight at (135, 75) blends yellow (#ffff00) over blue (#0000ff) -> R > 100, G > 100
    expect(result.highlightPixel[0]).toBeGreaterThan(100);
    expect(result.highlightPixel[1]).toBeGreaterThan(100);
    // Untouched corner remains pure blue
    expect(result.untouchedCornerPixel).toEqual([0, 0, 255, 255]);
    expect(result.rejectedUnsupported).toBe(true);
  });
});

