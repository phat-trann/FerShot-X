import { expect, test } from "@playwright/test";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";

test("explicit clipboard import recovers from no-image error and opens owned synthetic image", async ({ page }) => {
  await page.addInitScript((png) => {
    const target = window as unknown as { isTauri: boolean; __READS__: number; __TAURI_INTERNALS__: { invoke: (command: string) => Promise<unknown> } };
    target.isTauri = true; target.__READS__ = 0;
    target.__TAURI_INTERNALS__ = { invoke: async (command) => {
      if (command === "app_info") return { name: "Synthetic", version: "test", platform: "test" };
      if (command === "load_preferences") return { saveFormat: "png", jpegQuality: 90, downscaleRetina: false, showPreview: true };
      if (command === "import_clipboard") {
        target.__READS__ += 1;
        if (target.__READS__ === 1) throw { code: "clipboard_no_image", message: "Clipboard does not contain an image." };
        return { pngBase64: png, width: 2, height: 2, byteSize: atob(png).length };
      }
      throw new Error(`Unexpected command ${command}`);
    } };
  }, PNG);
  await page.goto("/");
  expect(await page.evaluate(() => (window as unknown as { __READS__: number }).__READS__)).toBe(0);
  const open = page.getByRole("button", { name: "Open clipboard image", exact: true });
  await open.click();
  await expect(page.getByRole("alert")).toContainText("Clipboard does not contain an image");
  await expect(open).toBeEnabled(); await open.click();
  await expect(page.locator(".canvas-image")).toBeVisible();
  await expect(page.locator(".document-title")).toContainText("2 × 2 px");
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { __READS__: number }).__READS__)).toBe(2);
});

test("browser clipboard import reports desktop requirement without a clipboard read", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open clipboard image", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Open the desktop app");
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(0);
});
