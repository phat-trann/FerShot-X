import { expect, test } from "@playwright/test";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";
const fixture = { name: "clipboard-fixture.png", mimeType: "image/png", buffer: Buffer.from(PNG, "base64") };

test("browser copy reports desktop requirement and keeps the image", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Copy image", exact: true })).toHaveCount(0);
  await page.locator('input[type="file"]').setInputFiles(fixture);
  await page.getByRole("button", { name: "Copy image", exact: true }).click();
  await expect(page.locator(".error-banner")).toContainText("Open the desktop app");
  await expect(page.locator(".canvas-image")).toHaveAttribute("alt", fixture.name);
  await expect(page.getByRole("button", { name: "Copy image", exact: true })).toBeEnabled();
});

test("mock clipboard failure releases busy state and retry sends real rasterized PNG", async ({ page }) => {
  // This fake IPC NEVER accesses the real system clipboard. Browser canvas is real.
  await page.addInitScript(() => {
    const target = window as unknown as {
      isTauri: boolean;
      __COPY_CALLS__: { pngBase64: string }[];
      __TAURI_INTERNALS__: { invoke: (command: string, args: { request: { pngBase64: string } }) => Promise<unknown> };
    };
    target.isTauri = true;
    target.__COPY_CALLS__ = [];
    target.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "load_preferences") return { saveFormat: "png", jpegQuality: 90, downscaleRetina: false, showPreview: true };
      if (command === "app_info") return { name: "Synthetic", version: "test", platform: "test" };
      if (command !== "copy_image") throw new Error(`Unexpected command: ${command}`);
      target.__COPY_CALLS__.push(args.request);
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (target.__COPY_CALLS__.length === 1) throw { code: "clipboard_failed", message: "Synthetic clipboard busy" };
      return null;
    } };
  });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(fixture);
  const copy = page.getByRole("button", { name: "Copy image", exact: true });
  await copy.click();
  await expect(copy).toBeDisabled();
  await expect(page.getByRole("button", { name: `Close ${fixture.name}`, exact: true })).toBeDisabled();
  await expect(page.locator(".error-banner")).toContainText("Synthetic clipboard busy");
  await expect(copy).toBeEnabled();
  await copy.click();
  await expect(page.locator(".statusbar")).toContainText("Image copied to clipboard.");
  await expect(page.locator(".error-banner")).toHaveCount(0);
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(1);
  const result = await page.evaluate(() => {
    const calls = (window as unknown as { __COPY_CALLS__: { pngBase64: string }[] }).__COPY_CALLS__;
    const bytes = Uint8Array.from(atob(calls[1].pngBase64), (c) => c.charCodeAt(0));
    const header = new DataView(bytes.buffer);
    return { count: calls.length, keys: Object.keys(calls[1]), width: header.getUint32(16), height: header.getUint32(20), signature: [...bytes.slice(0, 8)] };
  });
  expect(result).toEqual({ count: 2, keys: ["pngBase64"], width: 2, height: 2, signature: [137, 80, 78, 71, 13, 10, 26, 10] });
});
