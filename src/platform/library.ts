import { parseLocalDraft,type LocalDraft } from "../contracts/local-draft";
import { renderWorkspaceDocument } from "./annotations";
import { recordDiagnostic } from "./diagnostics";
import { invoke,isTauri } from "@tauri-apps/api/core";
import { documentFromPayload, type ImagePayload } from "./native";
export type LibraryKind="local"|"ftp";
async function call<T>(command:string,args?:Record<string,unknown>):Promise<T>{if(!isTauri())throw new Error("Library images are available in the desktop app.");try{return await invoke<T>(command,args);}catch(error){recordDiagnostic("image","failed",error&&typeof error==="object"&&"code"in error?error.code:"other");throw new Error(error&&typeof error==="object"&&"message"in error?String(error.message):"Library operation failed. Refresh and retry.");}}
type LibraryPayload={name:string;image:ImagePayload;localId?:string;draft?:LocalDraft};
export async function readLibraryImage(kind:LibraryKind,id:string){const value=await call<LibraryPayload>("library_image",{kind,id});const base=documentFromPayload(value.image,value.name);if(!value.draft)return base;try{const draft=parseLocalDraft(value.draft,base.width,base.height);const rendered=await renderWorkspaceDocument(base,draft.annotations,draft.advanced);return rendered;}finally{URL.revokeObjectURL(base.src);}}
export async function readLibraryThumbnail(kind:LibraryKind,id:string){return documentFromPayload(await call<ImagePayload>("library_thumbnail",{kind,id}),"Thumbnail");}
export const editLibraryImage=(kind:LibraryKind,id:string)=>call<void>("edit_library_image",{kind,id});
export async function takeEditorImage(){if(!isTauri())return null;const value=await call<LibraryPayload|null>("take_editor_image");if(!value)return null;const image=documentFromPayload(value.image,value.name);try{return {...image,localId:value.localId,draft:value.draft?parseLocalDraft(value.draft,image.width,image.height):undefined};}catch(error){URL.revokeObjectURL(image.src);throw error;}}
export async function showEditor(){if(isTauri())await call<void>("show_editor");}
export async function showLibrary(){if(isTauri())await call<void>("show_library");else window.open("?library","fershot-library");}
export async function listenLibrary(event:string,handler:()=>void){if(!isTauri())return()=>{};const {listen}=await import("@tauri-apps/api/event");return listen(event,handler);}

export async function fitEditorWindow(width:number,height:number){if(isTauri())await call<void>("fit_editor_window",{width,height});}
