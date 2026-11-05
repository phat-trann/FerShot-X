import { expect, test } from "@playwright/test";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";

test("pin page scales/changes image opacity and calls only owner-bound native actions", async ({ page }) => {
  await page.addInitScript((png) => {
    const target = window as unknown as { isTauri: boolean; __PIN_CALLS__: string[]; __TAURI_INTERNALS__: { invoke: (command: string, args: Record<string, unknown>) => Promise<unknown> } };
    target.isTauri = true; target.__PIN_CALLS__ = [];
    target.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (Object.keys(args).length) throw new Error("Pin requests must not choose another window");
      target.__PIN_CALLS__.push(command);
      if (command === "get_pin") return { sourceId: "source", name: "synthetic-pin.png", image: { pngBase64: png, width: 2, height: 2, byteSize: atob(png).length } };
      if (["copy_pin", "edit_pin", "close_pin"].includes(command)) return null;
      throw new Error(`Unexpected command ${command}`);
    } };
  }, PNG);
  await page.goto("/?pin=1");
  const image = page.getByRole("img", { name: "synthetic-pin.png", exact: true });
  await expect(image).toBeVisible();
  await page.getByRole("button", { name: "200%", exact: true }).click();
  await expect(image).toHaveAttribute("width", "4");
  await page.getByRole("button", { name: "Semi-transparent", exact: true }).click();
  await expect(image).toHaveCSS("opacity", "0.5");
  await page.getByRole("button", { name: "Copy Image", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Pinned image copied.");
  await page.getByRole("button", { name: "Edit Image", exact: true }).click();
  await page.getByRole("button", { name: "Close Pin", exact: true }).click();
  const calls = await page.evaluate(() => (window as unknown as { __PIN_CALLS__: string[] }).__PIN_CALLS__);
  expect(calls).toContain("copy_pin"); expect(calls).toContain("edit_pin"); expect(calls).toContain("close_pin");
  expect(calls.filter((call) => call !== "get_pin")).toHaveLength(3);
});

test("ordinary browser cannot fetch a native pin document", async ({ page }) => {
  await page.goto("/?pin=1");
  await expect(page.getByRole("alert")).toContainText("Open the desktop app");
  await expect(page.getByRole("img")).toHaveCount(0);
});

test("main workspace sends only a bounded raster and source identity to open a pin", async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as { isTauri: boolean; __OPEN_PIN__: unknown; __TAURI_INTERNALS__: { invoke: (command: string, args: { request?: unknown }) => Promise<unknown> } };
    target.isTauri = true;
    target.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "app_info") return { name: "Synthetic", version: "test", platform: "test" };
      if (command === "load_preferences") return { saveFormat: "png", jpegQuality: 90, downscaleRetina: false, showPreview: true };
      if (command === "open_pin") { target.__OPEN_PIN__ = args.request; return "pin-1"; }
      throw new Error(`Unexpected command ${command}`);
    } };
  });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: Buffer.from(PNG, "base64") });
  await page.getByRole("button", { name: "Pin image", exact: true }).click();
  await expect(page.locator(".statusbar")).toContainText("Image pinned.");
  const request = await page.evaluate(() => (window as unknown as { __OPEN_PIN__: { name: string; sourceId: string; pngBase64: string } }).__OPEN_PIN__);
  expect(Object.keys(request).sort()).toEqual(["name", "pngBase64", "sourceId"]);
  expect(request.sourceId).toMatch(/^[a-zA-Z0-9_-]+$/);
  expect(request.name).toBe("synthetic.png"); expect(request.pngBase64.length).toBeGreaterThan(24);
});
