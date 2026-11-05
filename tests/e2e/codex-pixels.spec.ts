import { expect, test } from "@playwright/test";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";
const fixture = (name: string) => ({ name, mimeType: "image/png", buffer: Buffer.from(PNG, "base64") });

test("inspects actual source pixel colors across zoom and session selection without IPC", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles([fixture("alpha.png"), fixture("beta.png")]);
  const image = page.locator(".canvas-image");
  await page.getByRole("button", { name: "Inspect color", exact: true }).click();
  const color = page.getByRole("status", { name: "Pixel color", exact: true });
  await expect(color).toContainText("Click the image");
  for (let i = 0; i < 12; i++) await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await image.click({ position: { x: 1, y: 1 } });
  await expect(color).toContainText("#ff0000 · RGBA 255, 0, 0, 255 · Pixel 0, 0");
  await expect(page.getByRole("button", { name: "Inspect color", exact: true })).toBeEnabled();
  await page.getByRole("spinbutton", { name: "Pixel X", exact: true }).fill("0");
  await page.getByRole("spinbutton", { name: "Pixel Y", exact: true }).fill("0");
  await page.getByRole("button", { name: "Sample color", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(color).toContainText("#ff0000");
  await page.getByRole("button", { name: "Select alpha.png", exact: true }).click();
  await expect(color).toContainText("Click the image");
  await page.getByRole("button", { name: "Select beta.png", exact: true }).click();
  await expect(color).toContainText("#ff0000");
  await page.getByRole("button", { name: "Inspect color", exact: true }).click();
  await expect(color).toHaveCount(0);
  await expect(image).toHaveAttribute("alt", "beta.png");
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(2);
});

test("samples alpha via keyboard coordinates at the minimum desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 540 });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name: "alpha-pixel.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DQAAAEgQGALFXOsAAAAABJRU5ErkJggg==", "base64") });
  await page.getByRole("button", { name: "Inspect color", exact: true }).click();
  await page.getByRole("button", { name: "Sample color", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status", { name: "Pixel color", exact: true })).toContainText("#ff0000 · RGBA 255, 0, 0, 128 · Pixel 0, 0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator(".canvas-image")).toHaveAttribute("alt", "alpha-pixel.png");
});
