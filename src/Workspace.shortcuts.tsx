import {useEffect,useRef,useState} from "react";
import {RotateCcw} from "lucide-react";
import {GlobalShortcutsV2Panel} from "./features/global-shortcuts-v2";
import {configureShortcuts,emptyHotkeys,HOTKEY_ACTIONS,readShortcuts,readSavedShortcuts,type HotkeyDraft} from "./platform/shortcuts-v2";
import type {GlobalActionIdV2} from "./features/global-shortcuts-v2";
import {supportsNativeOutput} from "./platform/native";
import {StatusMessage,type StatusTone} from "./components/ui/status";
import {Button} from "./components/ui/button";

export function WorkspaceShortcuts({blocked}:{blocked:boolean}) {
  const [draft,setDraft]=useState<HotkeyDraft>(emptyHotkeys),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[faulted,setFaulted]=useState(false),[savingAction,setSavingAction]=useState<GlobalActionIdV2|null>(null),[message,setMessage]=useState(""),[tone,setTone]=useState<StatusTone>("info");
  const pending=useRef(false),mounted=useRef(false);
  useEffect(()=>{
    mounted.current=true;let live=true;
    if(!supportsNativeOutput()){setMessage("Open the desktop app to configure shortcuts.");setTone("warning");return()=>{mounted.current=false;};}
    void readShortcuts().then(async active=>{
      let saved:HotkeyDraft|null=null;
      try{saved=(await readSavedShortcuts()).draft;}catch{if(live){setMessage("Saved shortcuts could not be read. Record a shortcut to replace them.");setTone("warning");}}
      if(!live)return;
      setDraft(HOTKEY_ACTIONS.some(action=>active.draft[action]!==null)?active.draft:saved??active.draft);setLoaded(true);setFaulted(active.faulted);
      if(active.faulted){setMessage("Reset shortcuts to recover the shortcut service.");setTone("warning");}
      else if(active.restorationFailed){setMessage("Saved shortcuts could not activate. Resolve conflicts and record again.");setTone("warning");}
    }).catch(()=>{if(live){setMessage("Shortcuts could not be loaded. Reopen Settings to retry.");setTone("error");}});
    return()=>{live=false;mounted.current=false;};
  },[]);
  async function save(next:HotkeyDraft,action:GlobalActionIdV2|null) {
    if(pending.current||blocked||!loaded)return;
    pending.current=true;setBusy(true);setSavingAction(action);setMessage("");
    try {
      const saved=await configureShortcuts(next);
      if(mounted.current){setDraft(saved.draft);setFaulted(saved.faulted);setMessage(action?next[action]?"Shortcut saved.":"Shortcut cleared.":"Shortcuts reset.");setTone("success");}
    } catch(reason) {
      if(mounted.current){setMessage(reason instanceof Error?reason.message:"Shortcut could not be saved.");setTone("error");}
      try{const active=await readShortcuts();if(mounted.current)setFaulted(active.faulted);}catch{/* Keep the previous confirmed values; never claim a failed write succeeded. */}
    } finally {
      pending.current=false;if(mounted.current){setBusy(false);setSavingAction(null);}
    }
  }
  return <section aria-label="Global capture shortcuts">
    <fieldset aria-label="Global shortcuts" disabled={blocked||busy||!loaded||faulted}><h3 className="preference-section-title">Hotkeys</h3>
      <GlobalShortcutsV2Panel value={draft} disabled={blocked||busy||!loaded||faulted} savingAction={savingAction} onChange={(next,action)=>void save(next,action)}/>
    </fieldset>
    {faulted&&<Button icon={RotateCcw} variant="warning" disabled={blocked||busy||!loaded} onClick={()=>void save(emptyHotkeys(),null)}>Reset Shortcuts</Button>}
    <StatusMessage tone={tone} aria-label="Shortcut status">{tone==="error"||tone==="warning"?message:""}</StatusMessage>
  </section>;
}
