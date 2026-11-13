import {test,expect} from "@playwright/test";
import {mock} from "./helpers/v1-ipc";
import {readFileSync} from "node:fs";
const APP_VERSION=JSON.parse(readFileSync("package.json","utf8")).version;
const NEXT_VERSION=APP_VERSION.replace(/\d+$/, (patch:string)=>String(Number(patch)+1));
test("one explicit Settings install click downloads, installs and restarts through official plugin IPC",async({page})=>{
 await mock(page);await page.context().addInitScript(({version,nextVersion})=>{const w=window as any,invoke=w.__TAURI_INTERNALS__.invoke;w.__UPDATE_STATE__={phase:"idle",availableVersion:null,downloaded:0,total:null,error:null};w.__TAURI_INTERNALS__.invoke=async(command:string,args:any={})=>{
  if(command==="updater_configuration"||command==="claim_update_check"){w.__CALLS__.push({command,args});return true;}
  if(command==="read_update_notification_status")return "idle";
  if(command==="test_update_notification"){w.__NOTICE_TRIES__=(w.__NOTICE_TRIES__??0)+1;if(w.__NOTICE_TRIES__===1)throw {code:"notification_denied",message:"denied"};return;}
  if(command==="read_update_state")return w.__UPDATE_STATE__;
  if(command==="publish_update_state"){w.__UPDATE_STATE__=args.snapshot;w.__EMIT__("fershot-update-state",args.snapshot);return;}
  if(command==="request_update"){w.opener.__EMIT__("fershot-updater-action",args.action);return;}
  if(command==="plugin:updater|check"){w.__CALLS__.push({command,args});return {rid:100,currentVersion:version,version:nextVersion,rawJson:{}};}
  if(command==="plugin:updater|download"){w.__CALLS__.push({command,args});args.onEvent.onmessage({event:"Started",data:{contentLength:1048576}});args.onEvent.onmessage({event:"Progress",data:{chunkLength:1048576}});args.onEvent.onmessage({event:"Finished"});return 101;}
  return invoke(command,args);
 };
 // All popups receive shared status emitted by main, like the native event bus.
 const emit=w.__EMIT__;w.__EMIT__=(name:string,payload:any)=>{emit(name,payload);if(name==="fershot-update-state"&&w.__SETTINGS__){w.__SETTINGS__.__UPDATE_STATE__=payload;w.__SETTINGS__.__EMIT__(name,payload);}};
 },{version:APP_VERSION,nextVersion:NEXT_VERSION});
 await page.goto("/?editor");await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.some((c:any)=>c.command==="plugin:event|listen"&&c.args.event==="fershot-updater-action"))).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(window as any).__UPDATE_STATE__.phase)).toBe("available");await expect(page.getByRole("complementary",{name:"App update available"})).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="plugin:updater|check").length)).toBe(1);
 const popup=page.waitForEvent("popup");await page.evaluate(()=>{(window as any).__SETTINGS__=window.open("/?preferences&tab=updates","updater-settings");});const settings=await popup;
 await expect(settings.getByRole("tab",{name:"Updates",exact:true})).toHaveAttribute("data-state","active");await expect(settings.getByText(APP_VERSION,{exact:true})).toBeVisible();await expect(settings.getByRole("button",{name:"Test Notification",exact:true})).toHaveCount(0);await expect(settings.getByRole("img",{name:"FerShot X",exact:true})).toBeVisible();await expect(settings.getByRole("button",{name:"Check for Updates",exact:true})).toHaveText("");await settings.getByRole("button",{name:"Check for Updates",exact:true}).click();await expect(settings.getByText(NEXT_VERSION,{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="plugin:updater|install").length)).toBe(0);
 expect(await page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="plugin:process|restart").length)).toBe(0);
 await settings.getByRole("button",{name:"Install Update",exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__CALLS__.filter((c:any)=>c.command==="plugin:process|restart").length)).toBe(1);
 const commands=await page.evaluate(()=>(window as any).__CALLS__.map((c:any)=>c.command));expect(commands.indexOf("plugin:updater|download")).toBeLessThan(commands.indexOf("plugin:updater|install"));expect(commands.indexOf("plugin:updater|install")).toBeLessThan(commands.indexOf("plugin:process|restart"));
});
