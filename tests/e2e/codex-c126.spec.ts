import {expect,test} from "@playwright/test";
import {installSettingsIpc} from "./helpers/v1-settings";

test("Settings uses leading section dividers, quiet autosave and inline folder icons",async({page})=>{
 await installSettingsIpc(page);await page.addInitScript(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__FOLDER__="Synthetic folder";w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="read_export_destination")return {folderLabel:w.__FOLDER__,basename:"Capture"};if(command==="choose_export_directory"||command==="update_export_destination"){w.__PREFS_CALLS__.push({command,args});w.__FOLDER__=command==="choose_export_directory"?"Chosen folder":null;return {folderLabel:w.__FOLDER__,basename:"Capture"};}return invoke(command,args);};});
 await page.setViewportSize({width:532,height:637});await page.goto("/?preferences");const folder=page.getByRole("textbox",{name:"Screenshots folder",exact:true});await expect(folder).toHaveValue("Synthetic folder");
 for(const name of ["Choose Folder…","Reset Folder"]){const button=page.getByRole("button",{name,exact:true});await expect(button).toHaveText("");await expect(button.locator("svg")).toHaveCount(1);const input=(await folder.boundingBox())!,box=(await button.boundingBox())!;expect(box.y).toBe(input.y);expect(box.height).toBe(input.height);expect(box.x).toBeGreaterThan(input.x);}
 await page.getByRole("button",{name:"Choose Folder…",exact:true}).click();await expect(folder).toHaveValue("Chosen folder");await page.getByRole("button",{name:"Reset Folder",exact:true}).click();await expect(folder).toHaveValue("Ask each time");await expect(page.getByRole("button",{name:"Reset Folder",exact:true})).toBeDisabled();
 for(const tab of ["General","Hotkeys","Uploading","Advanced","Updates"]){
  await page.getByRole("tab",{name:tab,exact:true}).click();const panel=page.locator('[role="tabpanel"]:visible'),headings=panel.getByRole("heading");expect(await headings.count()).toBeGreaterThan(0);
  for(const heading of await headings.all()){await expect(heading).toHaveCSS("text-align","left");expect(await heading.evaluate(el=>getComputedStyle(el,"::after").borderTopStyle)).toBe("solid");const box=(await heading.boundingBox())!,pane=(await panel.boundingBox())!;expect(box.x).toBe(pane.x);}
  await expect(panel.locator('p[data-tone="success"]:visible,p[data-tone="info"]:visible')).toHaveCount(0);expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:`artifacts/qa/C126-${tab.toLowerCase()}.png`,animations:"disabled"});
 }
});

test("startup status retry is an icon beside its switch and refreshes support",async({page})=>{
 await installSettingsIpc(page,"unbundled");await page.goto("/?preferences");const toggle=page.getByRole("checkbox",{name:"Launch at startup",exact:true}),retry=page.getByRole("button",{name:"Retry startup status",exact:true});await expect(toggle).toBeDisabled();await expect(retry).toHaveText("");
 const button=(await retry.boundingBox())!,control=(await toggle.boundingBox())!;expect(button.y+button.height/2).toBe(control.y+control.height/2);expect(button.x).toBeGreaterThan(control.x);await expect(retry).toHaveCSS("border-top-width","0px");await expect(retry).toHaveCSS("background-color","rgba(0, 0, 0, 0)");
 await page.evaluate(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>command==="read_login_state"?{supported:true,enabled:false}:invoke(command,args);});await retry.click();await expect(toggle).toBeEnabled();await expect(retry).toHaveCount(0);
});
