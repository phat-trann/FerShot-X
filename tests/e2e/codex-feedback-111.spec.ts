import {test,expect} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";
import {installSettingsIpc} from "./helpers/v1-settings";
test("global shortcut rows save and clear immediately while preserving other assignments",async({page})=>{
 await mock(page);await page.goto("/?preferences&tab=hotkeys");const panel=page.getByTestId("global-shortcuts-v2-panel");
 const area=panel.getByRole("button",{name:"Record shortcut for Area screenshot",exact:true});await expect(area).toBeEnabled();
 await expect(panel.getByRole("button",{name:/Install Shortcuts|Remove Shortcuts/})).toHaveCount(0);
 await area.click();await page.keyboard.press("Meta+Shift+a");
 await expect(area).toHaveText("⇧⌘A");
 expect(await page.evaluate(()=>(window as any).__ACTIVE_SHORTCUTS__["capture-area"])).toBe("Super+Shift+KeyA");expect(await page.evaluate(()=>(window as any).__SAVED_SHORTCUTS__["capture-area"])).toBe("Super+Shift+KeyA");
 await panel.getByRole("button",{name:"Record shortcut for Fullscreen screenshot",exact:true}).click();await page.keyboard.press("Meta+Shift+1");
 await expect(panel.getByRole("button",{name:"Record shortcut for Fullscreen screenshot",exact:true})).toHaveText("⇧⌘1");
 expect(await page.evaluate(()=>(window as any).__SAVED_SHORTCUTS__["capture-fullscreen"])).toBe("Super+Shift+Digit1");
 await panel.getByRole("button",{name:"Clear shortcut for Area screenshot",exact:true}).click();await expect(area).toHaveText("Record Shortcut");
 expect(await page.evaluate(()=>(window as any).__SAVED_SHORTCUTS__["capture-area"])).toBeNull();expect(await page.evaluate(()=>(window as any).__ACTIVE_SHORTCUTS__["capture-area"])).toBeNull();
 expect(await page.evaluate(()=>(window as any).__SAVED_SHORTCUTS__["capture-fullscreen"])).toBe("Super+Shift+Digit1");
 expect(await page.evaluate(()=>(window as any).__CALLS__.filter((call:any)=>call.command==="configure_shortcuts").length)).toBe(3);
});
test("Library previews the newest first row on each tab and preserves manual selection on refresh",async({page})=>{
 await mock(page);await page.goto("/");await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected","true");await expect(page.getByRole("img",{name:"Shared.png",exact:true})).toBeVisible();
 await page.getByRole("tab",{name:/Local/}).click();await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected","true");await expect(page.getByRole("img",{name:"Design.png",exact:true})).toBeVisible();
 await page.getByRole("option",{name:/Notes.png/}).click();await page.getByRole("button",{name:"Refresh library",exact:true}).click();await expect(page.getByRole("option",{name:/Notes.png/})).toHaveAttribute("aria-selected","true");await expect(page.getByRole("img",{name:"Notes.png",exact:true})).toBeVisible();
});
test("Settings saves quietly and failures retain semantic error colors",async({page})=>{
 await installSettingsIpc(page);await page.goto("/?preferences");await page.getByRole("radio",{name:"JPEG",exact:true}).check();await expect.poll(()=>page.evaluate(()=>(window as any).__PREFS_CALLS__.filter((c:any)=>c.command==="save_application_preferences").at(-1)?.args.preferences.baseSettings.saveFormat)).toBe("jpeg");await expect(page.getByText("Preferences saved.",{exact:true})).toHaveCount(0);
 await page.evaluate(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="save_application_preferences")throw {code:"settings_failed",message:"Synthetic save failure"};return invoke(command,args);};});await page.getByRole("radio",{name:"PNG",exact:true}).check();await expect(page.getByRole("alert")).toHaveCSS("color","rgb(255, 133, 133)");
});
