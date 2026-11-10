import type { Page } from "@playwright/test";

export async function openSettingsPopup(page: Page): Promise<Page> {
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const preferences = await opened;
  await preferences.waitForLoadState("domcontentloaded");
  return preferences;
}
