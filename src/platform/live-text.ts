import {isTauri} from "@tauri-apps/api/core";
import {invoke} from "./ipc";
export type LiveTextState="idle"|"analyzing"|"ready"|"empty";
export type LiveTextFrame={x:number;y:number;width:number;height:number};
type NativeStatus={state:"inactive"|"analyzing"|"ready"|"empty"};
async function call(command:string,request:unknown):Promise<NativeStatus>{try{const result=await invoke<NativeStatus>(command,{request});if(!result||!["inactive","analyzing","ready","empty"].includes(result.state))throw new Error("Live Text returned an invalid state.");return result;}catch(error){throw new Error(error&&typeof error==="object"&&"message"in error?String(error.message):"Live Text could not start. Try again.");}}
export async function supportsLiveText(){return isTauri()&&(await invoke<unknown>("live_text_supported"))===true;}
export const openLiveText=(requestId:string,pngBase64:string,frame:LiveTextFrame)=>call("live_text_open",{requestId,pngBase64,frame});
export const layoutLiveText=(requestId:string,frame:LiveTextFrame,visible:boolean)=>call("live_text_layout",{requestId,frame,visible});
export async function closeLiveText(requestId:string){if(isTauri())await invoke("live_text_close",{requestId});}
