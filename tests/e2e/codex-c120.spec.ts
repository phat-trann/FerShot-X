import {closeSettingsPopup} from "./helpers/preferences";
import {expect,test} from "@playwright/test";
import {installSettingsIpc} from "./helpers/v1-settings";

test("Settings autosaves export names and retention without initial writes or Save buttons",async({page})=>{
 await installSettingsIpc(page);await page.addInitScript(()=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="update_export_destination"){w.__PREFS_CALLS__.push({command,args});return {folderLabel:null,basename:args.basename};}return invoke(command,args);};});
 await page.goto("/?preferences");await expect(page.getByLabel("Default File Name",{exact:true})).toHaveValue("Capture");
 expect(await page.evaluate(()=>(window as any).__PREFS_CALLS__.filter((c:any)=>c.command.startsWith("save_")||c.command.startsWith("ftp_save")).length)).toBe(0);
 await page.getByLabel("Default File Name",{exact:true}).fill("My capture");
 await expect.poll(()=>page.evaluate(()=>(window as any).__PREFS_CALLS__.find((c:any)=>c.command==="update_export_destination")?.args.basename)).toBe("My capture");
 await page.getByRole("tab",{name:"Advanced",exact:true}).click();await page.getByLabel("Error log retention days",{exact:true}).fill("30");
 await expect.poll(()=>page.evaluate(()=>(window as any).__PREFS_CALLS__.filter((c:any)=>c.command==="save_log_preferences").at(-1)?.args.retentionDays)).toBe(30);
 for(const name of ["General","Uploading","Advanced"]){await page.getByRole("tab",{name,exact:true}).click();await expect(page.getByRole("button",{name:/^Save /})).toHaveCount(0);}
 await page.getByRole("tab",{name:"General",exact:true}).click();await page.screenshot({path:"artifacts/qa/C120-settings-autosave.png",animations:"disabled"});
});

test("FTP autosave serializes slow writes without clearing newer credentials",async({page})=>{
 await installSettingsIpc(page);await page.addInitScript(()=>{const w=window as any;localStorage.setItem("synthetic-ftp-settings",JSON.stringify({host:"ftp.example.invalid",port:21,username:"user",remoteDir:"/s",monthlyFolders:false,publicBaseUrl:"https://images.example.invalid",secure:true,namingMode:"random"}));const invoke=w.__TAURI_INTERNALS__.invoke;w.__SAVE_ACTIVE__=0;w.__SAVE_MAX__=0;w.__TAURI_INTERNALS__.invoke=async(command:string,args:any)=>{if(command==="ftp_save_settings"){w.__SAVE_ACTIVE__++;w.__SAVE_MAX__=Math.max(w.__SAVE_MAX__,w.__SAVE_ACTIVE__);await new Promise<void>(resolve=>setTimeout(resolve,700));try{return await invoke(command,args);}finally{w.__SAVE_ACTIVE__--;}}return invoke(command,args);};});
 await page.goto("/?preferences&tab=uploading");const password=page.getByLabel("Password",{exact:true});await expect(password).toBeEnabled();await password.fill("synthetic-first");await expect.poll(()=>page.evaluate(()=>(window as any).__SAVE_ACTIVE__)).toBe(1);
 await password.fill("synthetic-latest");await page.getByLabel("User folder",{exact:true}).fill("/updated");
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("synthetic-ftp-settings")!).remoteDir)).toBe("/updated");await expect(password).toHaveValue("");
 const result=await page.evaluate(()=>({max:(window as any).__SAVE_MAX__,calls:(window as any).__PREFS_CALLS__.filter((c:any)=>c.command==="ftp_save_settings")}));expect(result.max).toBe(1);expect(result.calls.at(-1).args.password).toBe("synthetic-latest");expect(result.calls.at(-1).args.settings.remoteDir).toBe("/updated");
});

test("Window blur flushes the last edit before closing Settings",async({page})=>{
 await installSettingsIpc(page);await page.goto("/");const popupPromise=page.waitForEvent("popup");await page.evaluate(()=>(window as any).__TAURI_INTERNALS__.invoke("open_preferences_window",{}));const settings=await popupPromise;
 const notify=settings.getByRole("checkbox",{name:"Notify when a capture is ready",exact:true});await expect(notify).toBeChecked();await notify.uncheck();
 await closeSettingsPopup(settings);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("synthetic-application-preferences")!).showSystemNotifications)).toBe(false);
});
