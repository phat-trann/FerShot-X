import { expect, test } from "@playwright/test";

async function openArchive(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const target = window as unknown as { isTauri: boolean; __ARCHIVE__: string | null; __TAURI_INTERNALS__: { invoke: (command: string, args: { raw?: string }) => Promise<unknown> } };
    target.isTauri = true; target.__ARCHIVE__ = null;
    target.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "app_info") return { name: "Synthetic", version: "0.1.0", platform: "test" };
      if (command === "load_preferences") return { saveFormat: "png", jpegQuality: 90, downscaleRetina: false, showPreview: true };
      if (command === "write_local_archive") { target.__ARCHIVE__ = args.raw!; return true; }
      if (command === "read_local_archive") return target.__ARCHIVE__;
      throw new Error(`Unexpected command ${command}`);
    } };
  });
  await page.goto("/");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 100; canvas.height = 80;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "white"; ctx.fillRect(0, 0, 100, 80);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "archive-source.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await page.getByRole("button", { name: "Local session archive", exact: true }).click();
  return png;
}

test("archive round trip preserves original image bytes and restores editable annotations under remapped ids", async ({ page }) => {
  const png = await openArchive(page);
  await page.getByRole("button", { name: "Annotate image", exact: true }).click();
  await page.getByRole("button", { name: "Rectangle tool", exact: true }).click();
  const bounds = await page.getByRole("application", { name: "Annotation canvas overlay" }).boundingBox();
  if (!bounds) throw new Error("Missing annotation overlay");
  await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.2);
  await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.7); await page.mouse.up();
  await expect(page.getByText("1 annotation", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Export archive", exact: true }).click();
  await expect(page.getByText("Archive exported with source bytes and editable annotations.", { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse((window as unknown as { __ARCHIVE__: string }).__ARCHIVE__));
  expect(saved.entries[0].bytesBase64).toBe(png);
  expect(saved.entries[0].annotations.basic).toHaveLength(1);
  expect(JSON.stringify(saved)).not.toContain("blob:");
  await page.getByRole("button", { name: "Import archive", exact: true }).click();
  await expect(page.getByText("Archive added; existing images and edits preserved.", { exact: true })).toBeVisible();
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(2);
  await page.getByRole("button", { name: "Select archive-source.png", exact: true }).nth(1).click();
  await expect(page.getByText("1 annotation", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Select tool", exact: true }).click();
  await page.getByTestId(`annotation-${saved.entries[0].annotations.basic[0].id}`).click({ position: { x: 1, y: 5 } });
  await page.getByRole("button", { name: "Delete Selected", exact: true }).click();
  await expect(page.getByText("0 annotations", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Select archive-source.png", exact: true }).first().click();
  await expect(page.getByText("1 annotation", { exact: true })).toBeVisible();
});

test("duplicate-id archive is rejected before library mutation", async ({ page }) => {
  await openArchive(page);
  await page.getByRole("button", { name: "Export archive", exact: true }).click();
  await expect(page.getByText("Archive exported with source bytes and editable annotations.", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const target = window as unknown as { __ARCHIVE__: string };
    const value = JSON.parse(target.__ARCHIVE__); value.entries.push(value.entries[0]); target.__ARCHIVE__ = JSON.stringify(value);
  });
  await page.getByRole("button", { name: "Import archive", exact: true }).click();
  await expect(page.getByText("Duplicate entry or invalid archive selection.", { exact: true })).toBeVisible();
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(1);
});
