import { expect, test } from "@playwright/test";

async function openWhiteImages(page: import("@playwright/test").Page) {
  await page.goto("/");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 100; canvas.height = 80;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 100, 80);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[type="file"]').setInputFiles(["first.png", "second.png"].map((name) => ({ name, mimeType: "image/png", buffer: Buffer.from(png, "base64") })));
  await page.getByRole("button", { name: "Annotate image", exact: true }).click();
}
async function drawRectangle(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Rectangle tool", exact: true }).click();
  const bounds = await page.getByRole("application", { name: "Annotation canvas overlay" }).boundingBox();
  if (!bounds) throw new Error("Missing overlay");
  await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.25);
  await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + bounds.height * 0.75); await page.mouse.up();
  await expect(page.getByText("1 annotation", { exact: true })).toBeVisible();
}

test("editor keeps per-image history, undo branches and merged original preservation", async ({ page }) => {
  await openWhiteImages(page); await drawRectangle(page);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText("0 annotations", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Select first.png", exact: true }).click();
  await expect(page.getByText("0 annotations", { exact: true })).toBeVisible();
  await drawRectangle(page);
  await page.getByRole("button", { name: "Select second.png", exact: true }).click();
  await expect(page.getByText("1 annotation", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Delete Selected", exact: true }).click();
  await expect(page.getByText("0 annotations", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Merge annotations", exact: true }).click();
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(3);
  await expect(page.locator(".document-title")).toContainText("second-merged.png");
  await expect(page.getByText("0 annotations", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Select second.png", exact: true }).click();
  await expect(page.getByText("1 annotation", { exact: true })).toBeVisible();
});

test("copy and save send annotated pixels to mocked native boundary", async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as { isTauri: boolean; __COPIES__: string[]; __TAURI_INTERNALS__: { invoke: (command: string, args: { request?: { pngBase64: string } }) => Promise<unknown> } };
    target.isTauri = true; target.__COPIES__ = [];
    target.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "load_preferences") return { saveFormat: "png", jpegQuality: 90, downscaleRetina: false, showPreview: true };
      if (command === "app_info") return { name: "Synthetic", version: "test", platform: "test" };
      if (command === "copy_image" || command === "save_image") { target.__COPIES__.push(args.request!.pngBase64); return command === "save_image" ? "/synthetic/annotated.png" : null; }
      throw new Error(`Unexpected command ${command}`);
    } };
  });
  await openWhiteImages(page); await drawRectangle(page);
  await page.getByRole("button", { name: "Copy image", exact: true }).click();
  await expect(page.locator(".statusbar")).toContainText("Image copied to clipboard");
  await page.getByRole("button", { name: "Save image…", exact: true }).click();
  await expect(page.locator(".statusbar")).toContainText("Image saved");
  const values = await page.evaluate(async () => {
    const encoded = (window as unknown as { __COPIES__: string[] }).__COPIES__;
    return Promise.all(encoded.map(async (base64) => {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
      return { width: image.width, height: image.height, color: [...ctx.getImageData(20, 40, 1, 1).data] };
    }));
  });
  expect(values).toHaveLength(2);
  for (const value of values) expect(value).toEqual({ width: 100, height: 80, color: [239, 68, 68, 255] });
});
