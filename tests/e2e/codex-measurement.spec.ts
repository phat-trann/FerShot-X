import { expect, test } from "@playwright/test";

test("measures explicit PX/PT coordinates and imprints real pixels into a new image", async ({ page }) => {
  await page.goto("/");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 200;
    const context = canvas.getContext("2d")!; context.fillStyle = "#ff0000"; context.fillRect(0, 0, 320, 200);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "probe.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await page.getByRole("button", { name: "Measure image", exact: true }).click();
  await page.getByLabel("Measurement x1", { exact: true }).fill("40");
  await page.getByLabel("Measurement y1", { exact: true }).fill("30");
  await page.getByLabel("Measurement x2", { exact: true }).fill("200");
  await page.getByLabel("Measurement y2", { exact: true }).fill("130");
  await page.getByLabel("Measurement pixels per point", { exact: true }).fill("2");
  await expect(page.getByLabel("Pixel dimensions", { exact: true })).toHaveText("160 × 100 px");
  await expect(page.getByLabel("Point dimensions", { exact: true })).toHaveText("80 × 50 pt");
  const original = await page.locator(".canvas-image").getAttribute("src");
  await page.getByRole("button", { name: "Imprint Dimensions", exact: true }).click();
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(2);
  await expect(page.locator(".canvas-image")).toHaveAttribute("alt", "probe-measured.png");
  const measured = await page.locator(".canvas-image").getAttribute("src");
  const pixels = await page.evaluate(async ({ original, measured }) => {
    async function inspect(src: string) {
      const image = new Image(); image.src = src; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
      return { width: canvas.width, height: canvas.height, badge: Array.from(context.getImageData(45, 35, 1, 1).data), outside: Array.from(context.getImageData(310, 190, 1, 1).data) };
    }
    return { original: await inspect(original!), measured: await inspect(measured!) };
  }, { original, measured });
  expect(pixels.original.badge).toEqual([255, 0, 0, 255]);
  expect(pixels.measured.badge).not.toEqual(pixels.original.badge);
  expect(pixels.measured.outside).toEqual([255, 0, 0, 255]);
  expect([pixels.measured.width, pixels.measured.height]).toEqual([320, 200]);
  await page.getByRole("button", { name: "Select probe.png", exact: true }).click();
  await expect(page.locator(".canvas-image")).toHaveAttribute("src", original!);
  await expect(page.getByLabel("Pixel dimensions", { exact: true })).toHaveText("320 × 200 px");
  await page.getByRole("button", { name: "Clear Measurement", exact: true }).click();
  await expect(page.getByRole("button", { name: "Imprint Dimensions", exact: true })).toBeDisabled();
});
