import { test, expect, type Page } from "@playwright/test";
import { mock } from "./helpers/v1-ipc";

async function expectIconActions(page: Page) {
  const actions = page.locator('[data-slot="button"]:visible:not([data-variant="plain"])');
  const invalid = await actions.evaluateAll(nodes => nodes.flatMap(node => {
    const style = getComputedStyle(node), icon = node.querySelector("svg");
    return !icon || parseFloat(style.borderTopWidth) <= 0 || style.backgroundColor === "rgba(0, 0, 0, 0)" || style.height !== "32px" || style.borderRadius !== "12px" ? [node.textContent?.trim()] : [];
  }));
  expect(invalid).toEqual([]);
}

test("all Settings groups are borderless and legend-free; actions share Edit geometry and leading icons", async ({ page }) => {
  await mock(page);
  await page.setViewportSize({ width: 532, height: 637 });
  await page.goto("/?preferences");
  for (const name of ["General", "Hotkeys", "Uploading", "Advanced", "Updates"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute("data-state","active");
    const panel = page.locator('[role="tabpanel"]:visible');
    await expect(panel.locator("fieldset").first()).toBeVisible();
    await expect(panel.locator("legend")).toHaveCount(0);
    const widths = await panel.locator("fieldset").evaluateAll(nodes => nodes.map(node => getComputedStyle(node).borderTopWidth));
    expect(widths.every(width => width === "0px")).toBe(true);
    await expectIconActions(page);
    expect(await page.locator(".preferences-content").evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  }
  await page.getByRole("tab", { name: "General", exact: true }).click();
  await expect(page.getByRole("group", { name: "Capture & export", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save preferences", exact: true })).toHaveCount(0);
  await expect(page.locator(".preferences-footer")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/qa/C112-settings-general.png", animations: "disabled" });
  await page.getByRole("tab", { name: "Uploading", exact: true }).click();
  await page.getByRole("textbox", { name: "FTP host", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/qa/C112-settings-uploading.png", animations: "disabled" });
});

test("Library and remote confirmation use the same framed icon buttons and preserve cancellation", async ({ page }) => {
  await mock(page);
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Shared.png", exact: true })).toBeVisible();
  await expectIconActions(page);
  await page.getByRole("button", { name: "Delete selected from FTP", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Delete permanently", exact: true })).toHaveCSS("color", "rgb(255, 129, 123)");
  for (const name of ["Cancel", "Delete permanently"]) {
    await expect(dialog.getByRole("button", { name, exact: true }).locator("svg")).toHaveCount(1);
    expect(await dialog.getByRole("button", { name, exact: true }).evaluate(node => parseFloat(getComputedStyle(node).borderTopWidth))).toBeGreaterThan(0);
  }
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Shared.png", exact: true })).toBeVisible();
});
