import { expect, test } from "@playwright/test";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";
const CROP_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAIAAAAW4yFwAAAADUlEQVR4nGP4zwAC/wEIAAH/2ZC7NQAAAABJRU5ErkJggg==";
const fixture = (name: string) => ({ name, mimeType: "image/png", buffer: Buffer.from(PNG, "base64") });

test("multi-image selection, close and same-file reimport preserve other documents", async ({ page }) => {
  await page.goto("/");
  const picker = page.locator('input[type="file"]');
  await picker.setInputFiles([fixture("first.png"), fixture("second.png")]);
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(2);
  await expect(page.locator(".canvas-image")).toHaveAttribute("alt", "second.png");
  await page.getByRole("button", { name: "Select first.png", exact: true }).click();
  await page.getByRole("button", { name: "Close first.png", exact: true }).click();
  await expect(page.locator(".canvas-image")).toHaveAttribute("alt", "second.png");
  await picker.setInputFiles(fixture("first.png"));
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(2);
  await expect(page.locator(".canvas-image")).toHaveAttribute("alt", "first.png");
  await picker.setInputFiles({ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
  await expect(page.locator(".error-banner")).toContainText("Choose a PNG");
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(2);
  await page.getByRole("button", { name: "Dismiss error" }).click();
  await picker.setInputFiles(fixture("third.png"));
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(3);
  await expect(page.locator(".error-banner")).toHaveCount(0);
});

test("browser capture is rejected without accessing the screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Capture Area/ }).click();
  await expect(page.locator(".error-banner")).toContainText("Open the desktop app");
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open an image", exact: true })).toBeEnabled();
});

test("mock IPC crop failure recovers, preserves original, and save forwards format/cancellation", async ({ page }) => {
  // The mock exercises only the web adapter. Rust pixel correctness is tested
  // independently; no native screen capture, dialog or disk write happens here.
  await page.addInitScript(({ original, cropped }) => {
    const target = window as unknown as {
      isTauri: boolean;
      __FERBY_TEST_CALLS__: { command: string; args: Record<string, unknown> }[];
      __TAURI_INTERNALS__: { invoke: (command: string, args: Record<string, unknown>) => Promise<unknown> };
    };
    target.isTauri = true;
    target.__FERBY_TEST_CALLS__ = [];
    let saves = 0;
    target.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      target.__FERBY_TEST_CALLS__.push({ command, args });
      if (command === "load_preferences") return { saveFormat: "png", jpegQuality: 90, downscaleRetina: false, showPreview: true };
      if (command === "app_info") return { name: "Synthetic IPC", version: "0.1.0", platform: "test" };
      const request = args.request as { crop?: { x: number }; format?: string };
      if (command === "process_image") {
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (request.crop?.x === 1) throw { code: "invalid_bounds", message: "Crop is outside image." };
        return { pngBase64: cropped, width: 1, height: 2, byteSize: atob(cropped).length };
      }
      if (command === "save_image") { saves += 1; return saves === 1 ? null : "/synthetic/result.jpg"; }
      throw new Error(`Unexpected command ${command}: ${original.length}`);
    } };
  }, { original: PNG, cropped: CROP_PNG });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(fixture("original.png"));
  await page.locator("summary").filter({ hasText: /^Crop$/ }).click();
  await page.getByRole("spinbutton", { name: "Crop X", exact: true }).fill("1");
  await page.getByRole("button", { name: "Apply crop", exact: true }).click();
  await expect(page.locator(".error-banner")).toContainText("crop must fit within image bounds");
  await page.getByRole("spinbutton", { name: "Crop width", exact: true }).fill("1");
  await page.getByRole("button", { name: "Apply crop", exact: true }).click();
  await expect(page.getByRole("button", { name: "Close original.png", exact: true })).toBeDisabled();
  await expect(page.locator(".error-banner")).toContainText("Crop is outside image");
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(1);
  await page.getByRole("spinbutton", { name: "Crop X", exact: true }).fill("0");
  await page.getByRole("spinbutton", { name: "Crop width", exact: true }).fill("1");
  await page.getByRole("button", { name: "Apply crop", exact: true }).click();
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(2);
  await expect(page.locator(".document-title")).toContainText("1 × 2 px");
  await expect(page.locator(".ferby-library-panel__item").filter({ hasText: "original.png" })).toHaveCount(1);
  await page.getByLabel("Export format", { exact: true }).selectOption("jpeg");
  await page.getByRole("button", { name: "Save image…", exact: true }).click();
  await expect(page.locator(".statusbar")).toContainText("Save cancelled.");
  await page.getByRole("button", { name: "Save image…", exact: true }).click();
  await expect(page.locator(".statusbar")).toContainText("Image saved.");
  const saveArgs = await page.evaluate(() => {
    const target = window as unknown as { __FERBY_TEST_CALLS__: { command: string; args: { request?: Record<string, unknown> } }[] };
    return target.__FERBY_TEST_CALLS__.filter((call) => call.command === "save_image").map((call) => call.args.request);
  });
  expect(saveArgs[1]).toMatchObject({ format: "jpeg", quality: 90, suggestedName: "original-cropped.jpg" });
});

test("minimum desktop-sized viewport does not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 540 });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(fixture("small.png"));
  await expect(page.locator(".canvas-image")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "Save image…", exact: true })).toBeVisible();
});
