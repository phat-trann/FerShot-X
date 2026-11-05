import { expect, test } from "@playwright/test";

const syntheticPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC", "base64");

test("imports an actual PNG, previews it, zooms and closes the session image", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bring the details into focus." })).toBeVisible();
  await page.screenshot({ path: "artifacts/qa/workspace-empty.png" });
  await page.locator('input[type="file"]').setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: syntheticPng });
  const preview = page.locator(".canvas-image");
  await expect(preview).toBeVisible();
  await expect(page.locator(".document-title")).toContainText("2 × 2 px");
  await expect(preview).toHaveJSProperty("naturalWidth", 2);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator(".zoom-controls")).toContainText("125%");
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await expect(preview).toHaveClass(/fit-image/);
  await page.getByRole("button", { name: "Close synthetic.png", exact: true }).click();
  await expect(preview).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Bring the details into focus." })).toBeVisible();
});

test("rejects a corrupt image without losing the existing document", async ({ page }) => {
  await page.goto("/");
  const picker = page.locator('input[type="file"]');
  await picker.setInputFiles({ name: "good.png", mimeType: "image/png", buffer: syntheticPng });
  await expect(page.locator(".canvas-image")).toBeVisible();
  await picker.setInputFiles({ name: "corrupt.png", mimeType: "image/png", buffer: Buffer.from("not a PNG") });
  await expect(page.getByRole("alert")).toContainText("This image could not be opened");
  await expect(page.locator(".canvas-image")).toHaveAttribute("alt", "good.png");
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(1);
});
