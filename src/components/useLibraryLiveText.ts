import {recordDiagnostic} from "../platform/diagnostics";
import {useEffect,useRef,type RefObject} from "react";
import type {ImageDocument} from "../contracts/media";
import {rasterizeDocument} from "../platform/native";
import {openLiveText,layoutLiveText,closeLiveText,type LiveTextFrame,type LiveTextState} from "../platform/live-text";
export function useLibraryLiveText(host:RefObject<HTMLDivElement|null>,image:ImageDocument,enabled:boolean,onState:(state:LiveTextState)=>void,onError:(message:string)=>void){
 const callbacks=useRef({onState,onError});callbacks.current={onState,onError};
 useEffect(()=>{
  const node=host.current;if(!node||!enabled)return;
  const requestId=crypto.randomUUID();let alive=true,opened=false,inflight=false,dirty=false,timer:ReturnType<typeof setTimeout>|undefined;const deadline=performance.now()+30000;
  let frame:LiveTextFrame={x:0,y:0,width:1,height:1};
  const measure=()=>{const box=node.getBoundingClientRect();if(box.width>=1&&box.height>=1)frame={x:Math.max(0,box.x),y:Math.max(0,box.y),width:box.width,height:box.height};return frame;};
  const visible=()=>!document.hidden&&!document.querySelector('[aria-modal="true"],[role="alertdialog"],[data-slot="alert-dialog-overlay"][data-state="open"],.library-opening-overlay');
  const close=()=>{void closeLiveText(requestId).catch(()=>{});};
  const fail=(error:unknown)=>{if(!alive)return;alive=false;clearTimeout(timer);close();callbacks.current.onError(error instanceof Error?error.message:"Live Text could not start. Try again.");};
  const receive=(state:"inactive"|"analyzing"|"ready"|"empty")=>{if(!alive)return;if(state==="inactive"){fail(new Error("Live Text closed. Try again."));return;}callbacks.current.onState(state);if(state==="analyzing"){if(performance.now()>deadline){recordDiagnostic("image","failed","other",{operation:"live_text_timeout",stage:"live_text_analysis",durationMs:30000});fail(new Error("Live Text took too long. Try again."));return;}clearTimeout(timer);timer=setTimeout(()=>void sync(),400);}else clearTimeout(timer);};
  async function sync(){if(!alive||!opened)return;if(inflight){dirty=true;return;}inflight=true;try{do{dirty=false;const result=await layoutLiveText(requestId,measure(),visible());if(alive)receive(result.state);}while(alive&&dirty);}catch(error){fail(error);}finally{inflight=false;}}
  callbacks.current.onState("analyzing");
  void rasterizeDocument(image).then(async png=>{if(!alive)return;const result=await openLiveText(requestId,png,measure());opened=true;if(!alive){close();return;}receive(result.state);void sync();}).catch(fail);
  const observer=new ResizeObserver(()=>void sync());observer.observe(node);
  const modal=new MutationObserver(()=>void sync());modal.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["aria-modal","hidden"]});
  const visibility=()=>void sync();document.addEventListener("visibilitychange",visibility);
  return()=>{alive=false;clearTimeout(timer);observer.disconnect();modal.disconnect();document.removeEventListener("visibilitychange",visibility);close();};
 },[host,image.src,image.width,image.height,enabled]);
}
