import {useSettingsAutosave} from "./use-settings-autosave";
import {StatusMessage,type StatusTone} from "./components/ui/status";
import { useEffect, useRef, useState } from "react";
import { FolderOpen } from "lucide-react";
import { readLogPreferences, saveLogPreferences, openLogsFolder } from "./platform/diagnostics";
import { Button } from "./components/ui/button";
import {ToolHint} from "./components/ui/tool-hint";
import { Input } from "./components/ui/input";
export function LogSettings() {
 const [tone,setTone]=useState<StatusTone>("info");
 const [days,setDays]=useState(7), [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const mounted=useRef(false),latestDays=useRef(days);
 const autosave=useSettingsAutosave<number>(async next=>{await saveLogPreferences(next);if(mounted.current&&latestDays.current===next){setTone("success");setNotice("Log retention saved.");}},error=>{if(mounted.current){setTone("error");setNotice(error instanceof Error?error.message:"Log retention could not be saved.");}});
 useEffect(()=>{mounted.current=true;let live=true;void readLogPreferences().then(p=>{if(live){latestDays.current=p.retentionDays;setDays(p.retentionDays);setReady(true);}}).catch(()=>{if(live){setTone("error");setNotice("Error log settings could not be loaded. Existing files are preserved.");}});return()=>{live=false;mounted.current=false;};},[]);
 async function run(operation:()=>Promise<void>){if(busy)return;setBusy(true);setNotice("");try{await operation();}catch(e){setTone("error");setNotice(e instanceof Error?e.message:"Log settings unavailable.");}finally{setBusy(false);}}
 return <fieldset aria-label="Error logs" disabled={busy}><h3 className="preference-section-title">Error logs</h3>
  <div className="preference-row"><span><label htmlFor="log-retention-days">Delete errors after</label></span><div className="flex items-center gap-2"><Input id="log-retention-days" className="w-20" aria-label="Error log retention days" type="number" min={1} max={90} step={1} value={days} disabled={!ready} onChange={e=>{const next=Number(e.target.value);latestDays.current=next;setDays(next);setNotice("");autosave.schedule(Number.isInteger(next)&&next>=1&&next<=90?next:null);}}/><span>days</span><ToolHint label="Open Logs Folder"><Button className="settings-inline-icon" icon={FolderOpen} aria-label="Open Logs Folder" variant="plain" size="icon" onClick={()=>void run(openLogsFolder)}/></ToolHint></div></div>
  <StatusMessage tone={tone} className="preference-help">{tone==="error"?notice:""}</StatusMessage>
 </fieldset>;
}
