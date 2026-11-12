import {StatusMessage,type StatusTone} from "./components/ui/status";
import { useEffect, useState } from "react";
import { FolderOpen, FileWarning } from "lucide-react";
import { readLogPreferences, saveLogPreferences, openLogsFolder } from "./platform/diagnostics";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
export function LogSettings() {
 const [tone,setTone]=useState<StatusTone>("info");
 const [days,setDays]=useState(7), [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{let live=true;void readLogPreferences().then(p=>{if(live){setDays(p.retentionDays);setReady(true);}}).catch(()=>{if(live){setTone("error");setNotice("Error log settings could not be loaded. Existing files are preserved.");}});return()=>{live=false;};},[]);
 async function run(operation:()=>Promise<void>){if(busy)return;setBusy(true);setNotice("");try{await operation();}catch(e){setTone("error");setNotice(e instanceof Error?e.message:"Log settings unavailable.");}finally{setBusy(false);}}
 return <fieldset disabled={busy}><legend><FileWarning size={15} aria-hidden="true"/> Error logs</legend>
  <label className="preference-row"><span>Delete errors after</span><div className="flex items-center gap-2"><Input className="w-20" aria-label="Error log retention days" type="number" min={1} max={90} step={1} value={days} disabled={!ready} onChange={e=>setDays(Number(e.target.value))}/><span>days</span></div></label>
  <p className="preference-help">errors.log: readable · events.json: structured</p>
  <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" size="sm" onClick={()=>void run(openLogsFolder)}><FolderOpen size={15} aria-hidden="true"/>Open Logs Folder</Button><Button size="sm" disabled={!ready||!Number.isInteger(days)||days<1||days>90} onClick={()=>void run(async()=>{const saved=await saveLogPreferences(days);setDays(saved.retentionDays);setTone("success");setNotice("Log retention saved.");})}>Save log retention</Button></div>
  <StatusMessage tone={tone} className="preference-help">{notice}</StatusMessage>
 </fieldset>;
}
