import { expect, test } from "@playwright/test";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";

test("preferences use typed mock persistence across reload and drive JPEG export quality", async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as { isTauri: boolean; __SAVED__: unknown; __TAURI_INTERNALS__: { invoke: (command: string, args: { settings?: unknown; request?: unknown }) => Promise<unknown> } };
    target.isTauri = true;
    target.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "app_info") return { name: "Synthetic", version: "test", platform: "test" };
      if (command === "load_preferences") return JSON.parse(localStorage.getItem("synthetic-preferences") ?? '{"saveFormat":"png","jpegQuality":90,"downscaleRetina":false,"showPreview":true}');
      if (command === "save_preferences") { localStorage.setItem("synthetic-preferences", JSON.stringify(args.settings)); return args.settings; }
      if (command === "save_image") { target.__SAVED__ = args.request; return "/synthetic/export.jpg"; }
      throw new Error(`Unexpected command ${command}`);
    } };
  });
  await page.goto("/");
  await page.locator("summary").filter({ hasText: /^Preferences$/ }).click();
  await page.getByLabel("Preferred export format", { exact: true }).selectOption("jpeg");
  await page.getByLabel("Preferred JPEG quality", { exact: true }).fill("73");
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(page.getByText("Preferences saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.locator("summary").filter({ hasText: /^Preferences$/ }).click();
  await expect(page.getByLabel("Preferred export format", { exact: true })).toHaveValue("jpeg");
  await expect(page.getByLabel("Preferred JPEG quality", { exact: true })).toHaveValue("73");
  await page.locator("summary").filter({ hasText: /^Preferences$/ }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: Buffer.from(PNG, "base64") });
  await expect(page.getByLabel("Export format", { exact: true })).toHaveValue("jpeg");
  await page.getByRole("button", { name: "Save image…", exact: true }).click();
  await expect(page.locator(".statusbar")).toContainText("Image saved");
  expect(await page.evaluate(() => (window as unknown as { __SAVED__: unknown }).__SAVED__)).toMatchObject({ format: "jpeg", quality: 73 });
});

test("corrupt preferences report defaults without an automatic overwrite", async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as { isTauri: boolean; __WRITES__: number; __TAURI_INTERNALS__: { invoke: (command: string) => Promise<unknown> } };
    target.isTauri = true; target.__WRITES__ = 0;
    target.__TAURI_INTERNALS__ = { invoke: async (command) => {
      if (command === "app_info") return { name: "Synthetic", version: "test", platform: "test" };
      if (command === "load_preferences") throw { code: "settings_failed", message: "Synthetic malformed file" };
      if (command === "save_preferences") { target.__WRITES__ += 1; throw new Error("Unexpected write"); }
      throw new Error(`Unexpected command ${command}`);
    } };
  });
  await page.goto("/");
  await page.locator("summary").filter({ hasText: /^Preferences$/ }).click();
  await expect(page.getByText("Saved preferences could not be loaded. Defaults are active.")).toBeVisible();
  await expect(page.getByLabel("Preferred JPEG quality", { exact: true })).toHaveValue("90");
  expect(await page.evaluate(() => (window as unknown as { __WRITES__: number }).__WRITES__)).toBe(0);
});
