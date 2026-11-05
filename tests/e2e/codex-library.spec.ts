import { expect, test } from "@playwright/test";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";
const fixture = (name: string) => ({ name, mimeType: "image/png", buffer: Buffer.from(PNG, "base64") });

test("library filters, switches layout and selects with keyboard", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles([fixture("alpha.png"), fixture("beta.png")]);
  const library = page.getByRole("region", { name: "Session Library", exact: true });
  const filter = library.getByRole("searchbox", { name: "Filter library images" });
  await filter.fill("alpha");
  await expect(library.getByRole("button", { name: "Select alpha.png", exact: true })).toBeVisible();
  await expect(library.getByRole("button", { name: "Select beta.png", exact: true })).toHaveCount(0);
  await filter.fill("missing");
  await expect(library.getByRole("status")).toContainText("No images match");
  await library.getByRole("button", { name: "Clear filter", exact: true }).click();
  await library.getByRole("button", { name: "Grid View", exact: true }).click();
  await expect(library).toHaveAttribute("data-layout", "grid");
  await library.getByRole("button", { name: "List View", exact: true }).click();
  const alpha = library.getByRole("button", { name: "Select alpha.png", exact: true });
  const beta = library.getByRole("button", { name: "Select beta.png", exact: true });
  await alpha.focus();
  await alpha.press("ArrowDown");
  await expect(beta).toBeFocused();
  await beta.press("ArrowUp");
  await expect(alpha).toBeFocused();
  await alpha.press("Enter");
  await expect(alpha).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".canvas-image")).toHaveAttribute("alt", "alpha.png");
});

test("library remove preserves selected survivor, then returns to empty state", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 540 });
  await page.goto("/");
  const library = page.getByRole("region", { name: "Session Library", exact: true });
  await expect(library.getByRole("status")).toContainText("No images in session library");
  await page.locator('input[type="file"]').setInputFiles([fixture("alpha.png"), fixture("beta.png")]);
  await library.getByRole("button", { name: "Remove alpha.png", exact: true }).click();
  await expect(page.locator(".canvas-image")).toHaveAttribute("alt", "beta.png");
  await library.getByRole("button", { name: "Remove beta.png", exact: true }).click();
  await expect(library.getByRole("status")).toContainText("No images in session library");
  await expect(page.getByRole("heading", { name: "Bring the details into focus." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
