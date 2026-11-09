import { expect, test } from "@playwright/test";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC", "base64");

for (const viewport of [{ width: 800, height: 540 }, { width: 1180, height: 780 }, { width: 1440, height: 900 }]) {
  test(`canvas and properties remain separate and usable at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto("/");
    await page.locator('input[type="file"]').setInputFiles({ name: "synthetic-design.png", mimeType: "image/png", buffer: PNG });
    await page.getByRole("button", { name: "Inspect color", exact: true }).click();
    const stage = page.getByRole("region", { name: "Image workspace" }), properties = page.getByRole("complementary", { name: "Tool properties" });
    const canvas = (await stage.boundingBox())!, panel = (await properties.boundingBox())!;
    expect(canvas.width).toBeGreaterThan(280); expect(canvas.height).toBeGreaterThan(200);
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(panel.x + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/qa/C43-inspector-${viewport.width}.png` });
    await page.getByRole("button", { name: "Close properties", exact: true }).click();
    await expect(properties).toHaveCount(0); await expect(page.getByRole("button", { name: "Inspect color", exact: true })).toHaveAttribute("aria-pressed", "false");
  });
}

test("settings contain focus, restore it on Escape and leave the canvas untouched", async ({ page }) => {
  await page.goto("/"); const trigger = page.getByRole("button", { name: "Settings", exact: true }); await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(dialog).toBeVisible(); await expect(page.getByRole("button", { name: "Close settings", exact: true })).toBeFocused();
  await page.getByText("Application behavior", { exact: true }).click();
  for (let index = 0; index < 20; index++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  await expect(page.getByRole("heading", { name: "Bring the details into focus." })).toBeVisible();
  expect(await page.locator("#root").getAttribute("inert")).toBeNull();
});
