import {expect,test} from "@playwright/test";
import {openSettingsPopup} from "./helpers/preferences";
import {installSettingsIpc,setQuality} from "./helpers/v1-settings";
test("Settings format and quality persist in its independent window",async({page})=>{await installSettingsIpc(page);await page.goto("/");const settings=await openSettingsPopup(page);await settings.getByRole("radio",{name:"JPEG",exact:true}).check();await setQuality(settings,73);await settings.getByRole("button",{name:"Save preferences",exact:true}).click();await expect(settings.locator(".preferences-footer").getByRole("status")).toHaveText("Preferences saved.");const closed=settings.waitForEvent("close");await settings.getByRole("button",{name:"Done",exact:true}).click();await closed;const again=await openSettingsPopup(page);await expect(again.getByRole("radio",{name:"JPEG",exact:true})).toBeChecked();await expect(again.getByRole("slider",{name:"Preferred JPEG quality",exact:true})).toHaveValue("73");});
test("Settings tabs are keyboard accessible, omit absent features, and fit a small window",async({page})=>{
  await installSettingsIpc(page);await page.goto("/");const preferences=await openSettingsPopup(page);await preferences.setViewportSize({width:620,height:540});
  const general=preferences.getByRole("tab",{name:"General",exact:true});await general.focus();await preferences.keyboard.press("End");await expect(preferences.getByRole("tab",{name:"Updates",exact:true})).toBeFocused();
  await preferences.keyboard.press("Home");await expect(general).toBeFocused();
  await expect(preferences.getByRole("tab",{name:/license|language|recognition/i})).toHaveCount(0);
  await preferences.getByRole("tab",{name:"Uploading",exact:true}).click();await preferences.getByLabel("FTP host",{exact:true}).fill("draft.example.invalid");
  await general.click();await preferences.getByRole("tab",{name:"Uploading",exact:true}).click();await expect(preferences.getByLabel("FTP host",{exact:true})).toHaveValue("draft.example.invalid");await general.click();
  expect(await preferences.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await preferences.screenshot({path:"artifacts/qa/C66-settings-light.png"});await preferences.emulateMedia({colorScheme:"dark"});await preferences.screenshot({path:"artifacts/qa/C66-settings-dark.png"});
});

test("corrupt saved preferences disable saving and never silently replace stored values",async({page})=>{
  await installSettingsIpc(page,"corrupt");await page.goto("/");const preferences=await openSettingsPopup(page);
  await expect(preferences.locator(".preferences-footer").getByRole("alert")).toContainText("Existing settings have been preserved");
  await expect(preferences.getByRole("button",{name:"Save preferences",exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>(window as any).__PREFS_CALLS__.filter((c:any)=>c.command.startsWith("save_")).length)).toBe(0);
});

test("failed atomic save preserves the draft and can be retried without partial-success wording",async({page})=>{
  await installSettingsIpc(page,"fail-save");await page.goto("/");const preferences=await openSettingsPopup(page);
  await preferences.getByRole("radio",{name:"JPEG",exact:true}).check();await preferences.getByRole("button",{name:"Save preferences",exact:true}).click();
  await expect(preferences.locator(".preferences-footer").getByRole("alert")).toHaveText("Synthetic write failure");await expect(preferences.getByRole("radio",{name:"JPEG",exact:true})).toBeChecked();
  await preferences.getByRole("button",{name:"Save preferences",exact:true}).click();await expect(preferences.locator(".preferences-footer").getByRole("status")).toHaveText("Preferences saved.");
});

test("HTTP preview credentials are configured separately and the entered password clears after save",async({page})=>{await installSettingsIpc(page);await page.goto("/");const preferences=await openSettingsPopup(page);await preferences.getByRole("tab",{name:"Uploading",exact:true}).click();await expect(preferences.getByLabel("HTTP username",{exact:true})).toHaveValue("preview-user");await preferences.getByLabel("HTTP password",{exact:true}).fill("synthetic-test-password");await preferences.getByRole("button",{name:"Save HTTP settings",exact:true}).click();await expect(preferences.getByRole("status",{name:"HTTP settings status"})).toContainText("HTTP settings saved");await expect(preferences.getByLabel("HTTP password",{exact:true})).toHaveValue("");const calls=await preferences.evaluate(()=>(window as any).__PREFS_CALLS__.filter((c:any)=>c.command==="ftp_save_preview_auth"));expect(calls[0].args.settings).toEqual({origin:"https://images.example.invalid",username:"preview-user",enabled:true});});


test("monthly FTP folder is separate from the user folder and persists independently",async({page})=>{
 await installSettingsIpc(page);await page.goto("/");const settings=await openSettingsPopup(page);await settings.getByRole("tab",{name:"Uploading",exact:true}).click();
 await settings.getByLabel("FTP host",{exact:true}).fill("ftp.example.invalid");await settings.getByLabel("Username",{exact:true}).fill("synthetic-user");await settings.getByLabel("Public base URL",{exact:true}).fill("https://images.example.invalid");await settings.getByLabel("User folder",{exact:true}).fill("/s");
 const monthly=settings.getByRole("switch",{name:"Group uploads by month",exact:true});await expect(monthly).not.toBeChecked();await expect(settings.getByLabel("Remote folder preview",{exact:true})).toHaveText("/s");await monthly.check();
 const suffix=await settings.evaluate(()=>{const d=new Date();return String(d.getFullYear()%100).padStart(2,"0")+String(d.getMonth()+1).padStart(2,"0");});await expect(settings.getByLabel("Remote folder preview",{exact:true})).toHaveText(`/s/${suffix}`);await settings.getByRole("switch",{name:"Require explicit TLS (FTPS)",exact:true}).check();await settings.getByRole("button",{name:"Save FTP settings",exact:true}).click();await expect(settings.getByRole("status",{name:"FTP settings status"})).toContainText("FTP settings saved");
 const stored=await settings.evaluate(()=>JSON.parse(localStorage.getItem("synthetic-ftp-settings")!));expect(stored.remoteDir).toBe("/s");expect(stored.monthlyFolders).toBe(true);expect(stored.secure).toBe(true);
 const closed=settings.waitForEvent("close");await settings.getByRole("button",{name:"Done",exact:true}).click();await closed;const again=await openSettingsPopup(page);await again.getByRole("tab",{name:"Uploading",exact:true}).click();await expect(again.getByRole("switch",{name:"Group uploads by month",exact:true})).toBeChecked();await expect(again.getByLabel("User folder",{exact:true})).toHaveValue("/s");
});

test("startup can be enabled in a supported app and disabled again",async({page})=>{
 await installSettingsIpc(page);await page.goto("/");const settings=await openSettingsPopup(page);const startup=settings.getByRole("switch",{name:"Launch at startup",exact:true});await expect(startup).toBeEnabled();await startup.check();await expect(startup).toBeChecked();await startup.uncheck();await expect(startup).not.toBeChecked();const calls=await settings.evaluate(()=>(window as any).__PREFS_CALLS__.filter((c:any)=>c.command==="set_launch_at_login"));expect(calls.map((c:any)=>c.args.enabled)).toEqual([true,false]);
});

test("compact Settings explains unbundled startup and removes focus outlines without overflow",async({page})=>{
 await installSettingsIpc(page,"unbundled");await page.goto("/");const settings=await openSettingsPopup(page);await settings.setViewportSize({width:532,height:490});await expect(settings.getByRole("switch",{name:"Launch at startup",exact:true})).toBeDisabled();await expect(settings.locator("#startup-help")).toContainText("installed FerShot X.app");
 for(const name of ["General","Hotkeys","Uploading","Advanced"]){const tab=settings.getByRole("tab",{name,exact:true});await tab.click();await tab.focus();expect(await tab.evaluate(el=>getComputedStyle(el).outlineStyle)).toBe("none");const bounds=await settings.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,layout:[".preferences-window",".preferences-content",".preferences-footer"].map(s=>{const e=document.querySelector(s)!;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {s,y:r.y,h:r.height,overflow:c.overflow,grid:c.gridTemplateRows,children:[...e.children].map(n=>({name:n.nodeName,h:n.getBoundingClientRect().height}))};}),wide:[...document.querySelectorAll("main *")].filter(el=>el.getBoundingClientRect().right>innerWidth).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right})).slice(0,8)}));expect(bounds.scrollWidth<=bounds.width&&bounds.scrollHeight<=bounds.height,`${name} ${JSON.stringify(bounds)}`).toBe(true);}
 expect(await settings.locator('.app-window-title').evaluate(el=>getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");await settings.screenshot({path:"artifacts/qa/C81-settings-compact.png"});
});


test("shared sliders keep native keyboard steps, fill and IPC persistence",async({page})=>{
 await installSettingsIpc(page);await page.goto("/");const settings=await openSettingsPopup(page),quality=settings.getByRole("slider",{name:"Preferred JPEG quality",exact:true});
 await expect(quality).toHaveAttribute("data-slot","slider");await quality.focus();await quality.press("Home");await expect(quality).toHaveValue("1");await quality.press("ArrowRight");await expect(quality).toHaveValue("2");await quality.press("End");await expect(quality).toHaveValue("100");
 expect(await quality.evaluate(el=>el.style.getPropertyValue("--slider-progress"))).toBe("100%");await expect(quality).toHaveCSS("outline-style","none");await expect(quality).toHaveCSS("filter","brightness(1.15)");
 await settings.getByRole("tab",{name:"Advanced",exact:true}).click();await expect(settings.getByRole("tab",{name:"Advanced",exact:true})).toHaveCSS("background-color","rgb(15, 18, 22)");const zoom=settings.getByRole("slider",{name:"Default zoom",exact:true});await zoom.press("Home");await zoom.press("ArrowRight");await expect(zoom).toHaveValue("50");await settings.getByRole("button",{name:"Save preferences",exact:true}).click();await expect(settings.locator('.preferences-footer').getByRole("status")).toHaveText("Preferences saved.");
 const saved=await settings.evaluate(()=>(window as any).__PREFS_CALLS__.filter((c:any)=>c.command==="save_application_preferences").at(-1).args.preferences);expect(saved.baseSettings.jpegQuality).toBe(100);expect(saved.defaultZoomPercent).toBe(50);
 await settings.screenshot({path:"artifacts/qa/C84-shared-controls.png"});
});

test("scroll speed saves separately and survives Settings reopen",async({page})=>{await installSettingsIpc(page);await page.goto("/");const settings=await openSettingsPopup(page);const slider=settings.getByRole("slider",{name:"Scroll capture speed",exact:true});await slider.press("Home");await settings.getByRole("button",{name:"Save scroll speed",exact:true}).click();await expect(settings.getByText("Scroll speed saved.",{exact:true})).toHaveAttribute("data-tone","success");const closed=settings.waitForEvent("close");await settings.getByRole("button",{name:"Done",exact:true}).click();await closed;const again=await openSettingsPopup(page);await expect(again.getByRole("slider",{name:"Scroll capture speed",exact:true})).toHaveValue("1");});
