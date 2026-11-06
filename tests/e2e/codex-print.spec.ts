import { expect, test } from "@playwright/test";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";

test("main workspace prepares a bounded print preview only after explicit request", async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as { isTauri: boolean; __PRINT_REQUESTS__: unknown[]; __TAURI_INTERNALS__: { invoke: (command: string, args: { request?: unknown }) => Promise<unknown> } };
    target.isTauri = true; target.__PRINT_REQUESTS__ = [];
    target.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "app_info") return { name: "Synthetic", version: "0.1.0", platform: "test" };
      if (command === "load_preferences") return { saveFormat: "png", jpegQuality: 90, downscaleRetina: false, showPreview: true };
      if (command === "open_print_preview") { target.__PRINT_REQUESTS__.push(args.request); return "print-synthetic"; }
      throw new Error(`Unexpected mocked command ${command}`);
    } };
  });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name: "print-source.png", mimeType: "image/png", buffer: Buffer.from(PNG, "base64") });
  await page.getByRole("button", { name: "Print / local output", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __PRINT_REQUESTS__: unknown[] }).__PRINT_REQUESTS__)).toEqual([]);
  await expect(page.getByLabel("Drag image payload")).toHaveAttribute("aria-disabled", "true");
  await page.getByLabel("Paper size", { exact: true }).selectOption("letter");
  await page.getByRole("button", { name: "Print Image…", exact: true }).click();
  await expect(page.locator(".statusbar")).toContainText("Print preview opened");
  const requests = await page.evaluate(() => (window as unknown as { __PRINT_REQUESTS__: Record<string, unknown>[] }).__PRINT_REQUESTS__);
  expect(requests).toHaveLength(1); expect(requests[0].options).toMatchObject({ imageWidth: 2, imageHeight: 2, paper: "letter", marginPt: 36 });
});

test("dedicated print preview renders supplied sheet and invokes no print dialog on load", async ({ page }) => {
  await page.addInitScript(({ png }) => {
    const target = window as unknown as { isTauri: boolean; __PRINT_COUNT__: number; __TAURI_INTERNALS__: { invoke: (command: string) => Promise<unknown> } };
    target.isTauri = true; target.__PRINT_COUNT__ = 0;
    target.__TAURI_INTERNALS__ = { invoke: async command => {
      if (command === "get_print_preview") return { image: { pngBase64: png, byteSize: atob(png).length, width: 2, height: 2 },
        options: { imageWidth: 2, imageHeight: 2, paper: "letter", orientation: "portrait", marginPt: 36, scaleMode: "fit" } };
      if (command === "print_preview") { target.__PRINT_COUNT__++; return; }
      if (command === "close_print_preview") return;
      throw new Error(`Unexpected mocked command ${command}`);
    } };
  }, { png: PNG });
  await page.goto("/?print=1");
  await expect(page.getByRole("button", { name: "Open system print dialog", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Print sheet")).toHaveCSS("width", "816px");
  expect(await page.evaluate(() => (window as unknown as { __PRINT_COUNT__: number }).__PRINT_COUNT__)).toBe(0);
  await page.getByRole("button", { name: "Open system print dialog", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Print dialog requested");
  expect(await page.evaluate(() => (window as unknown as { __PRINT_COUNT__: number }).__PRINT_COUNT__)).toBe(1);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-controls")).toBeHidden();
});
