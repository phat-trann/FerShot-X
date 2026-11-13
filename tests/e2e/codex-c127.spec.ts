import {expect,test} from "@playwright/test";
import {installSettingsIpc} from "./helpers/v1-settings";

test("Settings has no footer, uses control-first checkboxes and keeps error feedback in content",async({page})=>{
 await installSettingsIpc(page);await page.setViewportSize({width:532,height:637});await page.goto("/?preferences");
 await expect(page.locator("footer,.preferences-footer")).toHaveCount(0);await expect(page.getByRole("button",{name:"Done",exact:true})).toHaveCount(0);
 for(const tab of ["General","Uploading","Advanced"]){await page.getByRole("tab",{name:tab,exact:true}).click();const panel=page.locator('[role="tabpanel"]:visible');await expect(panel.getByRole("switch")).toHaveCount(0);expect(await panel.getByRole("checkbox").count()).toBeGreaterThan(0);
 for(const row of await panel.locator('.ui-checkbox-field').all()){const input=row.getByRole("checkbox"),label=row.locator('.ui-checkbox-field-label > label');expect(await input.getAttribute("id")).toBe(await label.getAttribute("for"));const control=(await input.boundingBox())!,text=(await label.boundingBox())!;expect(control.x+control.width).toBeLessThan(text.x);}
 expect(await page.locator('.preferences-content').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:`artifacts/qa/C127-${tab.toLowerCase()}.png`,animations:"disabled"});}
 await page.getByRole("tab",{name:"General",exact:true}).click();await page.evaluate(()=>{(window as any).__PREFS_FAIL_SAVE__=true;});await page.getByRole("checkbox",{name:"Notify when a capture is ready",exact:true}).uncheck();await expect(page.locator('.preferences-content').getByRole("alert")).toContainText("Synthetic write failure");
});

test("Updates shows the logo, inline icon check and real version status below",async({page})=>{
 await installSettingsIpc(page);await page.addInitScript(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__UPDATE__={phase:"current",availableVersion:null,downloaded:0,total:null,error:null};w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="read_update_state")return w.__UPDATE__;if(command==="request_update"){w.__UPDATE__={...w.__UPDATE__,phase:"available",availableVersion:"9.9.9"};w.__EMIT_NATIVE__("fershot-update-state",w.__UPDATE__);w.__PREFS_CALLS__.push({command,args});return;}return invoke(command,args);};});
 await page.setViewportSize({width:532,height:637});await page.goto("/?preferences&tab=updates");await expect(page.getByRole("img",{name:"FerShot X",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Test Notification",exact:true})).toHaveCount(0);
 const check=page.getByRole("button",{name:"Check for Updates",exact:true});await expect(check).toHaveText("");const row=page.locator('.update-current-version');const button=(await check.boundingBox())!,version=(await row.locator('strong').boundingBox())!;expect(button.x).toBeGreaterThan(version.x);expect(Math.abs(button.y+button.height/2-version.y-version.height/2)).toBeLessThan(1);
 const status=page.getByLabel("Update version status",{exact:true});await expect(status).toHaveCount(0);await expect(check).toHaveAttribute("data-current","true");await expect(check).toHaveCSS("color","rgb(101, 214, 154)");await expect(page.getByText("You're up to date.",{exact:true})).toHaveCount(0);
 await check.click();await expect(status).toHaveText("New version 9.9.9");await expect(page.getByRole("button",{name:"Install Update",exact:true})).toBeVisible();await page.mouse.move(0,0);await page.screenshot({path:"artifacts/qa/C127-updates.png",animations:"disabled"});
});
