import { parseLocalDraft,type LocalDraft } from "../contracts/local-draft";
import { recordDiagnostic } from "./diagnostics";
import { invoke,isTauri } from "@tauri-apps/api/core";
import { rasterizeDocument, documentFromPayload, type ImagePayload } from "./native";
export type LibraryKind="local"|"ftp";
async function call<T>(command:string,args?:Record<string,unknown>):Promise<T>{if(!isTauri())throw new Error("Library images are available in the desktop app.");const started=performance.now();try{return await invoke<T>(command,args);}catch(error){recordDiagnostic(args?.kind==="ftp"?"ftp":"image","failed",error&&typeof error==="object"&&"code"in error?error.code:"other",{operation:command,durationMs:performance.now()-started});throw new Error(error&&typeof error==="object"&&"message"in error?String(error.message):"Library operation failed. Refresh and retry.");}}
type LibraryPayload={name:string;image:ImagePayload;localId?:string;draft?:LocalDraft;requestId?:string};
export async function readLibraryImage(kind:LibraryKind,id:string){const value=await call<LibraryPayload>("library_image",{kind,id});const base=documentFromPayload(value.image,value.name);if(!value.draft)return base;try{const draft=parseLocalDraft(value.draft,base.width,base.height);if(!draft.annotations.length&&!draft.advanced.length)return base;const {renderWorkspaceDocument}=await import("./annotations");const rendered=await renderWorkspaceDocument(base,draft.annotations,draft.advanced);URL.revokeObjectURL(base.src);return rendered;}catch(error){URL.revokeObjectURL(base.src);throw error;}}
export async function readLibraryThumbnail(kind:LibraryKind,id:string){return documentFromPayload(await call<ImagePayload>("library_thumbnail",{kind,id}),"Thumbnail");}
export const editLibraryImage=(kind:LibraryKind,id:string,requestId?:string)=>call<void>("edit_library_image",{kind,id,...(requestId?{requestId}:{})});
export async function takeEditorImage(){if(!isTauri())return null;const value=await call<LibraryPayload|null>("take_editor_image");if(!value)return null;const image=documentFromPayload(value.image,value.name);try{return {...image,localId:value.localId,libraryRequestId:value.requestId,draft:value.draft?parseLocalDraft(value.draft,image.width,image.height):undefined};}catch(error){URL.revokeObjectURL(image.src);recordDiagnostic("image","failed","invalid_input",{operation:"take_editor_image"});throw error;}}
export async function showEditor(requestId?:string){if(isTauri())await call<void>("show_editor",requestId?{requestId}:undefined);window.dispatchEvent(new Event("fershot-editor-presented"));}
export async function showLibrary(){if(isTauri())await call<void>("show_library");else window.open("?library","fershot-library");}
export async function listenLibrary(event:string,handler:()=>void){if(!isTauri())return()=>{};const {listen}=await import("@tauri-apps/api/event");return listen(event,handler);}

export async function fitEditorWindow(width:number,height:number){if(isTauri())await call<void>("fit_editor_window",{width,height});}

/** Copy rendered draft snapshots as one native file-list clipboard operation. */
export async function copyLibraryImages(ids:readonly string[]){
 if(!ids.length||ids.length>32)throw new Error("Select between 1 and 32 images to copy.");
 const images:string[]=[];let total=0;
 for(const id of ids){const image=await readLibraryImage("local",id);try{const png=await rasterizeDocument(image);total+=png.length;if(total>64*1024*1024)throw new Error("Selected images are too large to copy together. Select fewer images.");images.push(png);}finally{URL.revokeObjectURL(image.src);}}
 await call<void>("copy_library_images",{images});
}

export async function listenEditorOpenResult(handler:(result:{requestId:string;success:boolean})=>void){if(!isTauri())return()=>{};const {listen}=await import("@tauri-apps/api/event");return listen<{requestId:string;success:boolean}>("fershot-editor-open-result",event=>handler(event.payload));}
