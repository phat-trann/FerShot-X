import { test, expect } from "@playwright/test";
import { mock } from "./helpers/v1-ipc";

test("FTP preview reuses A after B and tab changes, while Refresh reloads it", async ({ page }) => {
  await mock(page);
  // Match the desktop CSP: cached previews read only local Blob URLs.
  await page.route("**/*", async route => { if (!route.request().isNavigationRequest()) return route.continue(); const response = await route.fetch(); await route.fulfill({ response, headers: { ...response.headers(), "content-security-policy": "connect-src 'self' blob:" } }); });
  await page.addInitScript(() => {
    const w = window as any, now = Date.now();
    w.__FTP__ = [0, 1].map(i => ({ id: `ftp-${i}`, sourceId: `source-${i}`, name: `Image${i}.png`, remotePath: `/s/image${i}.png`, url: `https://example.invalid/s/image${i}.png`, status: "success", createdAt: now - i * 1000, updatedAt: now }));
  });
  await page.goto("/");
  const preview = page.locator(".library-preview img");
  await expect(preview).toBeVisible();
  await page.getByRole("option").nth(1).click(); await expect(preview).toHaveAttribute("alt", "Image1.png");
  await page.getByRole("option").first().click(); await expect(preview).toHaveAttribute("alt", "Image0.png");
  const reads = () => page.evaluate(() => (window as any).__CALLS__.filter((c: any) => c.command === "library_image" && c.args.kind === "ftp").map((c: any) => c.args.id));
  expect(await reads()).toEqual(["ftp-0", "ftp-1"]);
  await page.getByRole("tab", { name: /Local/ }).click(); await expect(preview).toHaveAttribute("alt", "Design.png");
  await page.getByRole("tab", { name: /FTP/ }).click(); await expect(preview).toHaveAttribute("alt", "Image0.png");
  expect(await reads()).toEqual(["ftp-0", "ftp-1"]);
  await page.getByRole("button", { name: "Refresh library", exact: true }).click();
  await expect.poll(reads).toEqual(["ftp-0", "ftp-1", "ftp-0"]); await expect(preview).toBeVisible();
  await page.getByRole("button", { name: "Remove history", exact: true }).click();
  await expect(page.getByRole("option")).toHaveCount(1); await expect(preview).toHaveAttribute("alt", "Image1.png");
  expect(await reads()).toEqual(["ftp-0", "ftp-1", "ftp-0", "ftp-1"]);
});
