import { expect, test } from "@playwright/test";

test("shortcut drafts register only on Apply and clear explicitly with typed native map", async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as { isTauri: boolean; __SHORTCUT_WRITES__: unknown[]; __TAURI_INTERNALS__: { invoke: (command: string, args: { bindings?: unknown }) => Promise<unknown> } };
    target.isTauri = true; target.__SHORTCUT_WRITES__ = [];
    const bindings = { "capture-fullscreen": null, "capture-area": null, "capture-window": null, "capture-scrolling": null, "ocr-capture": null };
    target.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "app_info") return { name: "Synthetic", version: "0.1.0", platform: "test" };
      if (command === "load_preferences") return { saveFormat: "png", jpegQuality: 90, downscaleRetina: false, showPreview: true };
      if (command === "get_shortcuts") return { bindings, faulted: false };
      if (command === "apply_shortcuts") { target.__SHORTCUT_WRITES__.push(args.bindings); return { bindings: args.bindings, faulted: false }; }
      throw new Error(`Unexpected mocked command ${command}`);
    } };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Global shortcuts", exact: true }).click();
  const apply = page.getByRole("button", { name: "Apply shortcuts for this session", exact: true });
  await expect(apply).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { __SHORTCUT_WRITES__: unknown[] }).__SHORTCUT_WRITES__)).toEqual([]);
  await page.getByRole("button", { name: "Record shortcut for Capture area", exact: true }).click();
  await page.keyboard.press("Control+Shift+A");
  await apply.click();
  await expect(page.getByText("Global shortcuts applied for this session.", { exact: true })).toBeVisible();
  const writes = await page.evaluate(() => (window as unknown as { __SHORTCUT_WRITES__: Record<string, unknown>[] }).__SHORTCUT_WRITES__);
  expect(writes).toHaveLength(1); expect(writes[0]["capture-area"]).toBe("Control+Shift+KeyA");
  await page.getByRole("button", { name: "Clear all shortcuts", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __SHORTCUT_WRITES__: unknown[] }).__SHORTCUT_WRITES__.length)).toBe(2);
});
