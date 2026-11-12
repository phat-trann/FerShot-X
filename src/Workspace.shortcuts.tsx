import {useEffect,useRef,useState} from "react";
import {GlobalShortcutsV2Panel} from "./features/global-shortcuts-v2";
import {configureShortcuts,emptyHotkeys,HOTKEY_ACTIONS,readShortcuts,readSavedShortcuts,type HotkeyDraft} from "./platform/shortcuts-v2";
import {supportsNativeOutput} from "./platform/native";
import {StatusMessage,type StatusTone} from "./components/ui/status";
export function WorkspaceShortcuts({blocked}:{blocked:boolean}){
 const [draft,setDraft]=useState<HotkeyDraft>(emptyHotkeys),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[tone,setTone]=useState<StatusTone>("info");const pending=useRef(false),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;let live=true;
  if(!supportsNativeOutput()){setMessage("Open the desktop app to configure shortcuts.");setTone("warning");return()=>{mounted.current=false;};}
  void readShortcuts().then(async active=>{
   let saved:HotkeyDraft|null=null;try{saved=(await readSavedShortcuts()).draft;}catch{if(live){setMessage("Saved shortcuts could not be read. Install replaces invalid saved assignments.");setTone("warning");}}
   if(!live)return;setDraft(HOTKEY_ACTIONS.some(a=>active.draft[a]!==null)?active.draft:saved??active.draft);setLoaded(true);
   if(active.faulted){setMessage("Remove shortcuts to finish cleanup, then install again.");setTone("warning");}
   else if(active.restorationFailed){setMessage("Saved shortcuts could not activate. Resolve conflicts, then install again.");setTone("warning");}
  }).catch(()=>{if(live){setMessage("Shortcuts could not be loaded. Reopen Settings to retry.");setTone("error");}});
  return()=>{live=false;mounted.current=false;};
 },[]);
 async function configure(remove=false){if(pending.current||blocked||!loaded)return;pending.current=true;setBusy(true);setMessage("");
  try{const value=await configureShortcuts(remove?emptyHotkeys():draft);if(mounted.current){setDraft(value.draft);setMessage(remove?"Shortcuts removed.":"Shortcuts installed and saved.");setTone("success");}}
  catch(reason){if(mounted.current){setMessage(reason instanceof Error?reason.message:"Shortcut configuration failed.");setTone("error");}}
  finally{pending.current=false;if(mounted.current)setBusy(false);}
 }
 return <section aria-label="Global capture shortcuts"><fieldset disabled={blocked||busy||!loaded}><legend>Global shortcuts</legend><GlobalShortcutsV2Panel value={draft} disabled={blocked||busy||!loaded} onChange={setDraft} onApply={()=>void configure()} onClear={()=>void configure(true)}/></fieldset><p className="preference-help">Installed shortcuts activate automatically when FerShot X starts.</p><StatusMessage tone={tone}>{message}</StatusMessage></section>;
}
