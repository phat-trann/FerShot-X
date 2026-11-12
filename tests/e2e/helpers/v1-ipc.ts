import type {Page} from "@playwright/test";
const PNG="iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";
export async function mock(page:Page){await page.context().addInitScript(({png})=>{
 const host=window as any,owner=host.opener??host;host.isTauri=true;owner.__CALLS__??=[];owner.__INBOX__??=[];host.__OWNER__=owner;
 const callbacks=new Map<number,any>(),subs=new Map<number,any>();let seq=0;
 host.__EMIT__=(event:string,payload:any=null)=>{for(const[id,sub]of subs)if(sub.event===event)callbacks.get(sub.handler)?.({event,id,payload});};host.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener:(_:string,id:number)=>subs.delete(id)};
 const image={pngBase64:png,width:2,height:2,byteSize:atob(png).length};const now=Date.now();
 owner.__LOCAL__??=[{id:"local-1",name:"Design.png",width:2,height:2,byteSize:atob(png).length,createdAt:now,expiresAt:now+30*86400000},{id:"local-2",name:"Notes.png",width:2,height:2,byteSize:90,createdAt:now-1000,expiresAt:now+30*86400000}];
 owner.__FTP__??=[{id:"123-1",sourceId:"uploaded-source",name:"Shared.png",remotePath:"/images/frozen.png",url:"https://example.invalid/images/frozen.png",status:"failed",createdAt:now,updatedAt:now,error:"Connection failed",errorCode:"ftp_connection"}];
 host.__TAURI_INTERNALS__={transformCallback:(fn:any)=>{const id=++seq;callbacks.set(id,fn);return id;},unregisterCallback:(id:number)=>callbacks.delete(id),invoke:async(command:string,args:any={})=>{
 owner.__CALLS__.push({command,args});
 if(command==="read_scroll_preferences")return {speed:Number(localStorage.getItem("synthetic-scroll-speed")??3)};
 if(command==="save_scroll_preferences"){localStorage.setItem("synthetic-scroll-speed",String(args.speed));return {speed:args.speed};}
 if(command==="local_cache_save_draft"){const r=args.request;owner.__DRAFTS__??={};owner.__DRAFTS__[r.id]={name:r.name,draft:r.draft,image:{...image,pngBase64:r.pngBase64??owner.__DRAFTS__[r.id]?.image.pngBase64??png,width:r.draft.width,height:r.draft.height,byteSize:atob(r.pngBase64??owner.__DRAFTS__[r.id]?.image.pngBase64??png).length}};const entry={id:r.id,name:r.name,width:r.draft.width,height:r.draft.height,byteSize:90,createdAt:now,expiresAt:now+30*86400000};owner.__LOCAL__=[entry,...owner.__LOCAL__.filter((x:any)=>x.id!==r.id)];return entry;}
 if(command==="plugin:event|listen"){const id=++seq;subs.set(id,args);return id;}if(command==="plugin:event|unlisten"){subs.delete(args.eventId);return;}
 if(command==="get_shortcuts"||command==="load_saved_shortcuts"){const empty=Object.fromEntries(["capture-fullscreen","capture-area","capture-window","capture-active-window","capture-repeat-region","capture-scrolling","ocr-capture","show-workspace"].map(id=>[id,null]));return {bindings:(command==="get_shortcuts"?owner.__ACTIVE_SHORTCUTS__:owner.__SAVED_SHORTCUTS__)??empty,faulted:false,restorationFailed:false};}
 if(command==="configure_shortcuts"){owner.__ACTIVE_SHORTCUTS__={...args.bindings};owner.__SAVED_SHORTCUTS__={...args.bindings};return {bindings:args.bindings,faulted:false};}
 if(command==="read_capture_upload_mode")return !!host.__AUTO_UPLOAD__;
 if(command==="local_cache_list")return owner.__LOCAL__;if(command==="ftp_list")return owner.__FTP__;
 if(command==="library_thumbnail")return image;
 if(command==="library_image"){if(host.__MISSING_PREVIEW__)throw {code:"cache_failed",message:"Retained preview is missing"};if(host.__DELAY_PREVIEW__&&args.id==="local-1")await new Promise(r=>setTimeout(r,250));return {name:args.id==="local-1"?"Design.png":args.id==="local-2"?"Notes.png":"Shared.png",image};}
 if(command==="edit_library_image"){owner.__INBOX__.push(args.kind==="local"&&owner.__DRAFTS__?.[args.id]?{...owner.__DRAFTS__[args.id],localId:args.id}:{name:args.kind==="ftp"?"Shared.png":"Design.png",image,localId:args.kind==="local"?args.id:undefined});const edit=window.open("?editor","fershot-editor","popup,width=1180,height=780");owner.__EDITOR__=edit;if(edit)setTimeout(()=>edit.__EMIT__?.("fershot-editor-image"),200);return;}
 if(command==="open_image_dialog")return host.__OPEN_FILE__?{name:"Added.png",mimeType:"image/png",base64:host.__ADDED_PNG__??png}:null;
 if(command==="take_editor_image")return owner.__INBOX__.shift()??null;
 if(command==="load_application_preferences")return {postCaptureBehavior:"open-editor",defaultZoomPercent:100,keepEditorAlwaysOnTop:false,showSystemNotifications:true,launchAtLogin:false,showInMenuBar:true,baseSettings:{saveFormat:"png",jpegQuality:90,downscaleRetina:false,showPreview:true}};
 if(command==="load_preferences")return {saveFormat:"png",jpegQuality:90,downscaleRetina:false,showPreview:true};
 if(command==="pending_documents"||command==="read_pending_deep_links")return [];
 if(command==="local_cache_store")return {id:args.request.id,name:args.request.name,width:2,height:2,byteSize:atob(args.request.pngBase64).length,createdAt:now,expiresAt:now+30*86400000};
 if(command==="process_image"){const source=await createImageBitmap(await (await fetch(`data:image/png;base64,${args.request.pngBase64}`)).blob());const rect=args.request.crop??{x:0,y:0,width:source.width,height:source.height};const c=document.createElement("canvas");c.width=rect.width;c.height=rect.height;c.getContext("2d")!.drawImage(source,rect.x,rect.y,rect.width,rect.height,0,0,c.width,c.height);source.close();const pngBase64=c.toDataURL("image/png").split(",")[1];return {pngBase64,width:c.width,height:c.height,byteSize:atob(pngBase64).length};}
 if(command==="capture_image"||command==="capture_scroll_image"||command==="import_clipboard")return image;if(command==="repeat_area_available")return true;
 if(command==="apply_image_effect")return image;
 if(command==="save_image")return !host.__CANCEL_SAVE__;
 if(command==="local_cache_remove"){owner.__LOCAL__=owner.__LOCAL__.filter((x:any)=>x.id!==args.id);return true;}
 if(command==="ftp_remove"||command==="ftp_delete_remote"){if(host.__FAIL_DELETE__||host.__FAIL_DELETE_ID__===args.id)throw {code:"ftp_failed",message:"Synthetic delete failure"};owner.__FTP__=owner.__FTP__.filter((x:any)=>x.id!==args.id);return;}
 if(command==="ftp_start"){if(host.__FAIL_RETRY__)throw {code:"ftp_connection",message:"Synthetic retry failed"};owner.__FTP__[0].status="uploading";return;}
 if(command==="app_info")return {name:"FerShot X",version:"1.0.0",platform:"synthetic"};
 if(command==="read_login_state")return {supported:false,enabled:false};
 return null;
 }};
 },{png:PNG});}
