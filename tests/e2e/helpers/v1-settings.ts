import type {Page} from "@playwright/test";
const PNG="iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";

export async function installSettingsIpc(page: Page, mode="normal") {
  await page.context().addInitScript(({ mode, png }) => {
    const host=window as any; const owner=host.opener ?? host;
    host.isTauri=true;host.__PREFS_CALLS__=owner.__PREFS_CALLS__ ?? [];host.__PREFS_FAIL_SAVE__=mode==="fail-save";
    let sequence=0;const callbacks=new Map<number,(event:any)=>void>();const subscriptions=new Map<number,{event:string;handler:number}>();
    host.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener:(_event:string,id:number)=>subscriptions.delete(id)};
    host.__EMIT_NATIVE__=(event:string,payload:any)=>{ for(const [id,item] of subscriptions)if(item.event===event)callbacks.get(item.handler)?.({event,id,payload}); };
    const base={saveFormat:"png",jpegQuality:90,downscaleRetina:false,showPreview:true};
    const defaults={postCaptureBehavior:"open-editor",defaultZoomPercent:100,keepEditorAlwaysOnTop:false,showSystemNotifications:true,launchAtLogin:false,showInMenuBar:true,baseSettings:base};
    const profile=()=>JSON.parse(localStorage.getItem("synthetic-application-preferences") ?? JSON.stringify(defaults));
    host.__TAURI_INTERNALS__={transformCallback:(callback:any)=>{const id=++sequence;callbacks.set(id,callback);return id;},unregisterCallback:(id:number)=>callbacks.delete(id),invoke:async(command:string,args:any={})=>{
      host.__PREFS_CALLS__.push({command,args});
 if(command==="read_scroll_preferences")return {speed:Number(localStorage.getItem("synthetic-scroll-speed")??3)};
 if(command==="save_scroll_preferences"){localStorage.setItem("synthetic-scroll-speed",String(args.speed));return {speed:args.speed};}
      if(command==="plugin:event|listen"){const id=++sequence;subscriptions.set(id,args);return id;}
      if(command==="plugin:event|unlisten"){subscriptions.delete(args.eventId);return;}
      if(command==="open_preferences_window"){window.open(`?preferences${args.tab?`&tab=${args.tab}`:""}`,"fershot-preferences","popup,width=532,height=637");return;}
      if(command==="close_preferences_window"){window.close();return;}
      if(command==="load_application_preferences" || command==="load_preferences"){if(mode==="corrupt")throw {code:"settings_failed",message:"Synthetic malformed preferences"};return command==="load_preferences"?profile().baseSettings:profile();}
      if(command==="save_application_preferences"){
        if(host.__PREFS_FAIL_SAVE__){host.__PREFS_FAIL_SAVE__=false;throw {code:"settings_failed",message:"Synthetic write failure"};}
        localStorage.setItem("synthetic-application-preferences",JSON.stringify(args.preferences));owner.__EMIT_NATIVE__?.("fershot-preferences-updated",null);return args.preferences;
      }
      if(command==="read_log_preferences")return {retentionDays:7};
      if(command==="save_log_preferences")return {retentionDays:args.retentionDays};
      if(command==="capture_image")return {pngBase64:png,width:2,height:2,byteSize:atob(png).length};
      if(command==="repeat_area_available")return true;
      if(command==="copy_image" && host.__FAIL_COPY__)throw {code:"clipboard_failed",message:"Synthetic clipboard failure"};
      if(command==="ftp_enqueue")return {id:"queued-synthetic",sourceId:args.request.sourceId,name:"synthetic.png",remotePath:"/images/frozen.png",url:"https://example.invalid/images/frozen.png",status:"pending",createdAt:Date.now(),updatedAt:Date.now()};
      if(command==="ftp_start" && host.__FAIL_UPLOAD__)throw {code:"ftp_connection",message:"Synthetic connection failure"};
      if(command==="read_login_state"){if(host.__FAIL_LOGIN__)throw new Error("Synthetic login read failure");return {supported:mode!=="unbundled",enabled:!!host.__STARTUP__};}
      if(command==="set_launch_at_login"){host.__STARTUP__=args.enabled;return args.enabled;}
      if(command==="read_export_destination")return {folderLabel:null,basename:"Capture"};
      if(command==="ftp_read_settings")return JSON.parse(localStorage.getItem("synthetic-ftp-settings")??"null");
      if(command==="ftp_save_settings"){localStorage.setItem("synthetic-ftp-settings",JSON.stringify(args.settings));return args.settings;}
      if(command==="ftp_read_preview_auth")return {origin:"https://images.example.invalid",username:"preview-user",enabled:true};
      if(command==="ftp_save_preview_auth")return args.settings;
      if(command==="ftp_list" || command==="local_cache_list" || command==="pending_documents" || command==="read_pending_deep_links")return [];
      if(command==="local_cache_store")return {id:args.request.id,name:args.request.name,width:2,height:2,byteSize:atob(args.request.pngBase64).length,createdAt:Date.now(),expiresAt:Date.now()+30*86400000};
      if(command==="save_image"){owner.__SAVED_EXPORT__=args.request;return !host.__CANCEL_SAVE__;}
      if(command==="open_image_dialog")return host.__CANCEL_OPEN__?null:{name:"menu-open.png",mimeType:"image/png",base64:png};
      if(command==="app_info")return {name:"FerShot X",version:"1.0.0",platform:"synthetic"};
      return null;
    }};
  },{mode,png:PNG});
}
export async function setQuality(page:Page,value:number){await page.getByRole("slider",{name:"Preferred JPEG quality"}).evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(node,String(value));node.dispatchEvent(new Event("input",{bubbles:true}));},value);}

