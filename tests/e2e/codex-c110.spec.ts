import { test, expect } from "@playwright/test";
import { mock } from "./helpers/v1-ipc";

test("Settings uses common rounded controls and preserves FTP settings through the shared form", async ({ page }) => {
  await mock(page);
  await page.addInitScript(() => { const w = window as any, invoke = w.__TAURI_INTERNALS__.invoke; w.__TAURI_INTERNALS__.invoke = async (command: string, args: any) => { if (command === "ftp_save_settings") { w.__CALLS__.push({ command, args }); return args.settings; } return invoke(command, args); }; });
  await page.goto("/?preferences");
  await expect(page.getByRole("tab", { name: "General", exact: true })).toBeVisible();
  expect(await page.locator("body").evaluate(element => getComputedStyle(element).getPropertyValue("--font-ui").trim())).toBe("system-ui, -apple-system, BlinkMacSystemFont, sans-serif");
  await expect(page.locator("body")).toHaveCSS("font-family", /^system-ui, -apple-system,/);
  await page.getByRole("tab", { name: "Uploading", exact: true }).click();
  const host = page.getByRole("textbox", { name: "FTP host", exact: true });
  await expect(host).toHaveCSS("height", "32px");
  await expect(host).toHaveCSS("border-radius", "12px");
  await expect(host).toHaveCSS("background-color", "rgb(15, 18, 22)");
  await host.fill("ftp.example.test");
  await page.getByRole("textbox", { name: "Username", exact: true }).fill("test-user");
  await page.getByRole("textbox", { name: "Public base URL", exact: true }).fill("https://images.example.test");
  const month = page.getByRole("checkbox", { name: "Group uploads by month", exact: true });
  await month.click();
  await expect(month).toHaveCSS("border-radius", "4px");
  await expect(page.getByRole("button",{name:"Save FTP settings",exact:true})).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.filter((call:any)=>call.command==="ftp_save_settings").at(-1)?.args.settings.host)).toBe("ftp.example.test");
  const request = await page.evaluate(() => (window as any).__CALLS__.filter((call: any) => call.command === "ftp_save_settings").at(-1));
  expect(JSON.stringify(request)).toContain("ftp.example.test");
  await expect(page.locator(".preferences-content fieldset").first()).toHaveCSS("border-radius", "20px");
});

test("Library and Edit retain shared typography, rounded selection and fixed canvas controls", async ({ page }) => {
  await mock(page);
  await page.goto("/");
  await expect(page.locator(".library-window")).toHaveCSS("font-family", /^system-ui, -apple-system,/);
  await expect(page.locator(".library-row").first()).toHaveCSS("border-radius", "16px");
  await page.goto("/?editor");
  const png = await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 400; canvas.height = 240; canvas.getContext("2d")!.fillRect(0, 0, 400, 240); return canvas.toDataURL().split(",")[1]; });
  await page.locator('input[type="file"]').setInputFiles({ name: "Controls.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.getByTestId("advanced-workbench-stage")).toBeVisible();
  await expect(page.getByRole("button",{name:"Copy image",exact:true})).toHaveCSS("border-top-color","rgba(0, 0, 0, 0)");
  await expect(page.getByRole("button",{name:"Copy image",exact:true})).toHaveCSS("background-color","rgba(0, 0, 0, 0)");
  await expect(page.getByRole("button", { name: "Fit image", exact: true })).toHaveCSS("width", "72px");
  await page.getByRole("button", { name: "Image size", exact: true }).click();
  await expect(page.getByLabel("Resize width")).toHaveCSS("height", "24px");
  await expect(page.getByLabel("Resize width")).toHaveCSS("border-radius", "5px");
  await expect(page.locator(".editor-size-popover")).toHaveCSS("border-radius", "16px");
  expect(await page.locator(".editor-size-presets").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(page.locator(".editor-size-presets svg")).toHaveCount(0);
});
