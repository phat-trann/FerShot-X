import {useCallback,useEffect,useRef} from "react";

let writes:Promise<unknown>=Promise.resolve();
/** Native preference commands share an exclusive operation guard. */
export function serializeSettingsWrite<T>(operation:()=>Promise<T>):Promise<T>{const next=writes.then(operation);writes=next.catch(()=>{});return next;}

/** Coalesce typing, serialize writes and flush before Settings closes. No initial write. */
export function useSettingsAutosave<T>(save:(snapshot:T)=>Promise<unknown>,onError:(error:unknown)=>void){
 const callbacks=useRef({save,onError});callbacks.current={save,onError};
 const invalid=useRef(false);
 const queued=useRef<{value:T}|null>(null),failed=useRef<{value:T}|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),worker=useRef<Promise<void>|null>(null);
 const flush=useCallback(()=>{
  if(timer.current){clearTimeout(timer.current);timer.current=null;}
  if(invalid.current){const error=new Error("Complete valid settings before closing.");callbacks.current.onError(error);return Promise.reject(error);}
  if(!queued.current&&failed.current){queued.current=failed.current;failed.current=null;}
  if(worker.current)return worker.current;
  const task=Promise.resolve().then(async()=>{
   let failure:unknown,hasFailure=false;
   while(queued.current){
    const snapshot=queued.current;queued.current=null;
    try{await serializeSettingsWrite(()=>callbacks.current.save(snapshot.value));failed.current=null;hasFailure=false;}
    catch(error){failed.current=snapshot;failure=error;hasFailure=true;callbacks.current.onError(error);}
   }
   if(hasFailure)throw failure;
  }).finally(()=>{worker.current=null;});
  worker.current=task;return task;
 },[]);
 const schedule=useCallback((value:T|null)=>{
  invalid.current=value===null;queued.current=value===null?null:{value};failed.current=null;
  if(timer.current)clearTimeout(timer.current);
  timer.current=value===null?null:setTimeout(()=>{timer.current=null;void flush().catch(()=>{});},300);
 },[flush]);
 useEffect(()=>{
  const background=()=>{void flush().catch(()=>{});};
  const collect=(event:Event)=>{(event as CustomEvent<Promise<unknown>[]>).detail.push(flush());};
  window.addEventListener("blur",background);window.addEventListener("pagehide",background);window.addEventListener("fershot-settings-flush",collect);
  return()=>{window.removeEventListener("blur",background);window.removeEventListener("pagehide",background);window.removeEventListener("fershot-settings-flush",collect);background();};
 },[flush]);
 return {schedule,flush};
}

export async function flushSettings(){const pending:Promise<unknown>[]=[];window.dispatchEvent(new CustomEvent("fershot-settings-flush",{detail:pending}));await Promise.all(pending);}
