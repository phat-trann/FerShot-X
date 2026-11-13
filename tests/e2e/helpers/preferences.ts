import type { Page } from "@playwright/test";

export async function openSettingsPopup(page: Page): Promise<Page> {
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const preferences = await opened;
  await preferences.waitForLoadState("domcontentloaded");
  return preferences;
}

/** Simulate native hide/close lifecycle with injected IPC; never send OS input. */
export async function closeSettingsPopup(page:Page){
 const closed=page.waitForEvent("close");
 await page.evaluate(async()=>{window.dispatchEvent(new Event("blur"));const pending:Promise<unknown>[]=[];window.dispatchEvent(new CustomEvent("fershot-settings-flush",{detail:pending}));await Promise.all(pending);await (window as any).__TAURI_INTERNALS__.invoke("close_preferences_window");});
 await closed;
}
