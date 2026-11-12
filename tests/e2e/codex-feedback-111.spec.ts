import {test,expect} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";
import {installSettingsIpc} from "./helpers/v1-settings";
test("global shortcuts expose two persistent actions and install/remove active and saved bindings together",async({page})=>{
 await mock(page);await page.goto("/?preferences&tab=hotkeys");const panel=page.getByTestId("global-shortcuts-v2-panel");
 await expect(panel.getByRole("button",{name:"Install Shortcuts",exact:true})).toBeEnabled();
 await expect(panel.getByRole("button",{name:/session|Save assignments|Forget saved|Clear all shortcuts/})).toHaveCount(0);
 await page.getByRole("button",{name:"Record shortcut for Capture area",exact:true}).click();await page.keyboard.press("Meta+Shift+a");await panel.getByRole("button",{name:"Install Shortcuts",exact:true}).click();
 await expect(page.getByText("Shortcuts installed and saved.")).toHaveAttribute("data-tone","success");
 expect(await page.evaluate(()=>(window as any).__ACTIVE_SHORTCUTS__["capture-area"])).toBe("Super+Shift+KeyA");expect(await page.evaluate(()=>(window as any).__SAVED_SHORTCUTS__["capture-area"])).toBe("Super+Shift+KeyA");
 await panel.getByRole("button",{name:"Remove Shortcuts",exact:true}).click();await expect(page.getByText("Shortcuts removed.")).toBeVisible();expect(await page.evaluate(()=>Object.values((window as any).__SAVED_SHORTCUTS__).every(value=>value===null))).toBe(true);
});
test("Library previews the newest first row on each tab and preserves manual selection on refresh",async({page})=>{
 await mock(page);await page.goto("/");await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected","true");await expect(page.getByRole("img",{name:"Shared.png",exact:true})).toBeVisible();
 await page.getByRole("tab",{name:/Local/}).click();await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected","true");await expect(page.getByRole("img",{name:"Design.png",exact:true})).toBeVisible();
 await page.getByRole("option",{name:/Notes.png/}).click();await page.getByRole("button",{name:"Refresh library",exact:true}).click();await expect(page.getByRole("option",{name:/Notes.png/})).toHaveAttribute("aria-selected","true");await expect(page.getByRole("img",{name:"Notes.png",exact:true})).toBeVisible();
});
test("Settings save success and failure use distinct semantic status colors",async({page})=>{
 await installSettingsIpc(page);await page.goto("/?preferences");await page.getByRole("button",{name:"Save preferences",exact:true}).click();await expect(page.getByText("Preferences saved.")).toHaveCSS("color","rgb(101, 214, 154)");
 await page.evaluate(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="save_application_preferences")throw {code:"settings_failed",message:"Synthetic save failure"};return invoke(command,args);};});await page.getByRole("button",{name:"Save preferences",exact:true}).click();await expect(page.getByRole("alert")).toHaveCSS("color","rgb(255, 133, 133)");
});
