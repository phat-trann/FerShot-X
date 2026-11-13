import {expect,test} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";
import {installSettingsIpc} from "./helpers/v1-settings";

test("Resize matches the compact reference and has no crop, close or glyph actions",async({page})=>{
 await mock(page);await page.goto("/?editor");const png=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=400;c.height=240;return c.toDataURL().split(",")[1];});await page.locator('input[type="file"]').setInputFiles({name:"Resize.png",mimeType:"image/png",buffer:Buffer.from(png,"base64")});
 await page.getByRole("button",{name:"Image size",exact:true}).click();const panel=page.getByRole("region",{name:"Resize image",exact:true});await expect(panel).toContainText("can't be undone!");await expect(panel.locator("svg")).toHaveCount(0);await expect(panel.getByRole("button",{name:/Cancel|Close|Crop/})).toHaveCount(0);await expect(panel.getByRole("button")).toHaveCount(7);
 await expect(panel.getByRole("button",{name:"1×",exact:true})).toHaveCSS("height","24px");await expect(page.getByLabel("Resize width")).toHaveCSS("height","24px");await page.getByRole("button",{name:"50%",exact:true}).click();await expect(page.getByLabel("Resize width")).toHaveValue("200");await expect(page.getByLabel("Resize height")).toHaveValue("120");await expect(page.getByRole("button",{name:"50%",exact:true})).toHaveCSS("background-color","rgb(37, 126, 254)");
 await page.mouse.move(0,0);await page.screenshot({path:"artifacts/qa/C128-resize.png",animations:"disabled"});await page.getByRole("button",{name:"Resize",exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="process_image").at(-1)?.args.request.resize)).toEqual({width:200,height:120});
});

test("Library header and preview bounds do not move when delayed FTP metadata loads",async({page})=>{
 await mock(page);await page.addInitScript(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__RELEASE_PREVIEW__=null;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="library_image")await new Promise<void>(done=>{w.__RELEASE_PREVIEW__=done;});return invoke(command,args);};});await page.goto("/");await expect.poll(()=>page.evaluate(()=>typeof (window as any).__RELEASE_PREVIEW__)).toBe("function");
 const header=page.locator('.library-detail > header'),preview=page.locator('.library-preview'),metrics=page.getByLabel("Image dimensions and file size");const before={header:await header.boundingBox(),preview:await preview.boundingBox(),metrics:await metrics.boundingBox()};await expect(metrics).toHaveText(/\s*/);
 await page.evaluate(()=>(window as any).__RELEASE_PREVIEW__());await expect(page.getByRole("img",{name:"Shared.png",exact:true})).toBeVisible();await expect(metrics).toContainText("2 × 2");expect(await header.boundingBox()).toEqual(before.header);expect(await preview.boundingBox()).toEqual(before.preview);expect(await metrics.boundingBox()).toEqual(before.metrics);
});

test("Settings utility icons are unframed and follow their text on the same row",async({page})=>{
 await installSettingsIpc(page,"unbundled");await page.setViewportSize({width:532,height:637});await page.goto("/?preferences");
 const check=(button:any)=>expect(button).toHaveCSS("background-color","rgba(0, 0, 0, 0)");
 const retry=page.getByRole("button",{name:"Retry startup status",exact:true}),startup=page.locator('.startup-checkbox-field .ui-checkbox-field-label > label');await check(retry);await expect(retry).toHaveCSS("border-top-width","0px");const label=(await startup.boundingBox())!,icon=(await retry.boundingBox())!;expect(icon.x).toBeGreaterThan(label.x+label.width);expect(icon.y+icon.height/2).toBe(label.y+label.height/2);
 await page.getByRole("tab",{name:"Advanced",exact:true}).click();const logs=page.getByRole("button",{name:"Open Logs Folder",exact:true});await expect(logs).toHaveText("");await check(logs);await expect(logs).toHaveCSS("border-top-width","0px");await logs.click();expect(await page.evaluate(()=>(window as any).__PREFS_CALLS__.some((c:any)=>c.command==="open_logs_folder"))).toBe(true);
 await page.mouse.move(0,0);await page.screenshot({path:"artifacts/qa/C128-log-action.png",animations:"disabled"});await page.getByRole("tab",{name:"Updates",exact:true}).click();const updates=page.getByRole("button",{name:"Check for Updates",exact:true});await check(updates);await expect(updates).toHaveCSS("border-top-width","0px");
});
