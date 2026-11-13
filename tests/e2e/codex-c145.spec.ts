import {test,expect} from "@playwright/test";
import {installSettingsIpc} from "./helpers/v1-settings";
test("Folder actions share neutral borders and Logs is one inline Days row",async({page})=>{
 await installSettingsIpc(page);await page.addInitScript(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__TAURI_INTERNALS__.invoke=(command:string,args:any)=>command==="read_export_destination"?Promise.resolve({folderLabel:"Example",basename:"Capture"}):invoke(command,args);});
 await page.goto("/?preferences");
 for(const name of ["Choose Folder…","Reset Folder"]){const button=page.getByRole("button",{name,exact:true});await expect(button).toBeEnabled();const before=await button.evaluate(el=>getComputedStyle(el).borderColor);await button.hover();await expect(button).toHaveCSS("border-color",before);await expect(button).toHaveCSS("opacity","1");const tip=page.getByRole("tooltip");await expect(tip).toBeVisible();await expect(tip).toHaveCSS("transform","none");}
 await page.getByRole("tab",{name:"Advanced",exact:true}).click();const days=page.getByRole("spinbutton",{name:"Error log retention days"}),logs=page.getByRole("button",{name:"Open Logs Folder",exact:true});await expect(logs).toHaveText("");const a=(await days.boundingBox())!,b=(await logs.boundingBox())!;expect(Math.abs(a.y+a.height/2-b.y-b.height/2)).toBeLessThan(1);expect(b.x).toBeGreaterThan(a.x+a.width);await expect(logs).toHaveCSS("border-top-width","0px");await expect(page.getByText("Open logs folder",{exact:true})).toHaveCount(0);
});
