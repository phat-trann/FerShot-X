import {invoke as nativeInvoke} from "@tauri-apps/api/core";
import operations from "./diagnostic-operations.json";
import {logNativeOperation} from "./diagnostics";
/** Shared application IPC boundary; no runtime patching or request inspection. */
export async function invoke<T>(...parameters:Parameters<typeof nativeInvoke>):Promise<T>{
 const command=parameters[0],start=performance.now();try{return await nativeInvoke<T>(...parameters);}catch(error){
  if(operations.includes(command)&&!command.includes("diagnostic")&&!command.includes("log_preferences")&&command!=="open_logs_folder"){
   const code=typeof error==="object"&&error!==null&&"code"in error?error.code:typeof error==="string"&&/^invalid args/i.test(error)?"invalid_input":"other";
   try{logNativeOperation(command,true,code,performance.now()-start);}catch{/* Diagnostics must preserve the original IPC failure. */}
  }throw error;
 }
}
