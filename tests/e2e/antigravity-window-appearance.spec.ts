import { expect, test } from "@playwright/test";

test.describe("A26 window capture appearance core (real browser pixels)", () => {
  test("renders transparent alpha, solid background, caller-supplied wallpaper, and explicit shadow-trim crop while preserving immutable source", async ({
    page,
  }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const mod = await import("/src/features/window-appearance/index.ts");

      // Create synthetic 100x80 window raster:
      // Outer 10px margin is semi-transparent shadow/transparent border (alpha = 0),
      // inner 80x60 window body at (10..90, 10..70):
      //   left half (10..50) is opaque green (#00ff00),
      //   right half (50..90) is transparent cutout (alpha = 0) so background shows through.
      const winCanvas = document.createElement("canvas");
      winCanvas.width = 100;
      winCanvas.height = 80;
      const winCtx = winCanvas.getContext("2d")!;
      winCtx.clearRect(0, 0, 100, 80);
      winCtx.fillStyle = "#00ff00";
      winCtx.fillRect(10, 10, 40, 60);

      const beforeWinSnapshot = Array.from(
        winCtx.getImageData(15, 15, 1, 1).data,
      );

      // Caller-provided wallpaper canvas (blue #0000ff)
      const wallCanvas = document.createElement("canvas");
      wallCanvas.width = 40;
      wallCanvas.height = 30;
      const wallCtx = wallCanvas.getContext("2d")!;
      wallCtx.fillStyle = "#0000ff";
      wallCtx.fillRect(0, 0, 40, 30);

      const trim = Object.freeze({ top: 10, right: 10, bottom: 10, left: 10 });

      // 1. Transparent background + shadow trim (100x80 -> 80x60)
      const transparentOut = mod.renderWindowAppearanceToCanvas({
        windowSource: winCanvas,
        windowWidth: 100,
        windowHeight: 80,
        background: { kind: "transparent" },
        shadowTrim: trim,
      });
      const tCtx = transparentOut.getContext("2d")!;

      // 2. Solid red background (#ff0000) + shadow trim
      const solidOut = mod.renderWindowAppearanceToCanvas({
        windowSource: winCanvas,
        windowWidth: 100,
        windowHeight: 80,
        background: { kind: "solid", color: "#ff0000" },
        shadowTrim: trim,
      });
      const sCtx = solidOut.getContext("2d")!;

      // 3. Wallpaper blue background + shadow trim via PNG blob
      const wallpaperBlob = await mod.renderWindowAppearanceToPngBlob({
        windowSource: winCanvas,
        windowWidth: 100,
        windowHeight: 80,
        background: {
          kind: "wallpaper",
          image: wallCanvas,
          imageWidth: 40,
          imageHeight: 30,
        },
        shadowTrim: trim,
      });
      const wallBitmap = await createImageBitmap(wallpaperBlob);
      const wOut = document.createElement("canvas");
      wOut.width = wallBitmap.width;
      wOut.height = wallBitmap.height;
      const wCtx = wOut.getContext("2d")!;
      wCtx.drawImage(wallBitmap, 0, 0);

      const afterWinSnapshot = Array.from(
        winCtx.getImageData(15, 15, 1, 1).data,
      );

      let rejectedInvalid = false;
      try {
        mod.renderWindowAppearanceToCanvas({
          windowSource: winCanvas,
          windowWidth: 100,
          windowHeight: 80,
          background: { kind: "transparent" },
          shadowTrim: { top: 50, right: 10, bottom: 40, left: 10 },
        });
      } catch {
        rejectedInvalid = true;
      }

      return {
        outWidth: transparentOut.width,
        outHeight: transparentOut.height,
        beforeWinSnapshot,
        afterWinSnapshot,
        transparentOpaqueLeft: Array.from(tCtx.getImageData(10, 30, 1, 1).data),
        transparentCutoutRight: Array.from(tCtx.getImageData(60, 30, 1, 1).data),
        solidOpaqueLeft: Array.from(sCtx.getImageData(10, 30, 1, 1).data),
        solidCutoutRight: Array.from(sCtx.getImageData(60, 30, 1, 1).data),
        wallpaperOpaqueLeft: Array.from(wCtx.getImageData(10, 30, 1, 1).data),
        wallpaperCutoutRight: Array.from(wCtx.getImageData(60, 30, 1, 1).data),
        rejectedInvalid,
      };
    });

    expect(result.outWidth).toBe(80);
    expect(result.outHeight).toBe(60);
    expect(result.afterWinSnapshot).toEqual(result.beforeWinSnapshot);
    expect(result.transparentOpaqueLeft).toEqual([0, 255, 0, 255]);
    expect(result.transparentCutoutRight).toEqual([0, 0, 0, 0]);
    expect(result.solidOpaqueLeft).toEqual([0, 255, 0, 255]);
    expect(result.solidCutoutRight).toEqual([255, 0, 0, 255]);
    expect(result.wallpaperOpaqueLeft).toEqual([0, 255, 0, 255]);
    expect(result.wallpaperCutoutRight).toEqual([0, 0, 255, 255]);
    expect(result.rejectedInvalid).toBe(true);
  });
});

