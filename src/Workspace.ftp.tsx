import {ChevronDown} from "lucide-react";
import {useSettingsAutosave} from "./use-settings-autosave";
import { FieldLabel, CheckboxField } from "./components/ui/field";
import {StatusMessage,type StatusTone} from "./components/ui/status";
import { readPreviewAuth,savePreviewAuth,type PreviewAuth } from "./platform/ftp";
import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type { FtpQueueItem, FtpSettings } from "./contracts/phase2";
import { copyUploadUrl, listFtpQueue, listenFtpQueue, readFtpSettings, removeFtpUpload, saveFtpSettings, startFtpUpload } from "./platform/ftp";
import { Input } from "./components/ui/input";
import { NativeSelect } from "./components/ui/select";
const DEFAULT: FtpSettings = { host: "", port: 21, username: "", remoteDir: "/s", monthlyFolders: false, publicBaseUrl: "", secure: false, namingMode: "random" };
export function WorkspaceFtpSettings() {
  const [value, setValue] = useState(DEFAULT);
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [tone,setTone]=useState<StatusTone>("info");
  const mounted = useRef(false);
  const latest=useRef({value,password});
  const autosave=useSettingsAutosave<{value:FtpSettings;password:string}>(async snapshot=>{
    const saved=await saveFtpSettings(snapshot.value,snapshot.password||null);
    if(mounted.current){
      if(latest.current===snapshot){latest.current={value:saved,password:""};setValue(saved);setPassword("");setTone("success");setNotice("FTP settings saved.");}
    }
  },error=>{if(mounted.current){setTone("error");setNotice(error instanceof Error?error.message:"Could not save FTP settings.");}});
  function update(next:{value:FtpSettings;password:string}){latest.current=next;setValue(next.value);setPassword(next.password);setNotice("");autosave.schedule(ready&&validFtp(next.value)?next:null);}
  useEffect(() => { mounted.current = true; let live = true;
    if (!isTauri()) { setNotice("FTP settings are available in the desktop app."); return () => { mounted.current = false; }; }
    void readFtpSettings().then(settings => { if (live) { if (settings) {const value={...DEFAULT,...settings};latest.current={value,password:""};setValue(value);} setReady(true); } }).catch(error => { if (live){setTone("error");setNotice(error.message);} });
    return () => { live = false; mounted.current = false; };
  }, []);
  const date=new Date();const monthFolder=`${String(date.getFullYear()%100).padStart(2,"0")}${String(date.getMonth()+1).padStart(2,"0")}`;
  const folder=`${value.remoteDir.replace(/\/+$/,"")}${value.monthlyFolders?`/${monthFolder}`:""}`||"/";
  const field = (key: keyof FtpSettings, next: string | number | boolean) => update({...latest.current,value:{...latest.current.value,[key]:next}});
  return <section aria-label="FTP publishing settings"><h3 className="preference-section-title">FTP publishing</h3>
    <form onSubmit={event=>{event.preventDefault();void autosave.flush().catch(()=>{});}}><fieldset aria-label="FTP connection" disabled={!ready}>
      <FieldLabel><span>FTP host</span><Input required autoComplete="off" value={value.host} onChange={event => field("host", event.target.value)} placeholder="ftp.example.com" /></FieldLabel>
      <FieldLabel><span>Port</span><Input required type="number" min="1" max="65535" value={value.port} onChange={event => field("port", Number(event.target.value))} /></FieldLabel>
      <FieldLabel><span>Username</span><Input required autoComplete="off" value={value.username} onChange={event => field("username", event.target.value)} /></FieldLabel>
      
      <FieldLabel><span>Password</span><Input type="password" autoComplete="new-password" value={password} onChange={event => update({...latest.current,password:event.target.value})} placeholder="Leave blank to keep password" /></FieldLabel>
      <FieldLabel><span>User folder</span><Input aria-label="User folder" required value={value.remoteDir} onChange={event => field("remoteDir", event.target.value)} placeholder="/s" /></FieldLabel>
      <CheckboxField label="Group uploads by month" checked={!!value.monthlyFolders} onCheckedChange={enabled=>field("monthlyFolders",enabled)}/>
      <div className="preference-row"><span>Remote folder</span><output aria-label="Remote folder preview">{folder}</output></div>
      <FieldLabel><span>Public base URL</span><Input required type="url" value={value.publicBaseUrl} onChange={event => field("publicBaseUrl", event.target.value)} placeholder="https://cdn.example.com" /></FieldLabel>
      
      <FieldLabel><span>Upload filename</span><span className="upload-filename-select"><NativeSelect aria-label="Upload filename" value={value.namingMode} onChange={event => field("namingMode", event.target.value)}>
        <option value="random">Random (current)</option>
        <option value="timestamp">Timestamp (DDHHmmssN)</option>
      </NativeSelect><ChevronDown size={16} strokeWidth={1.75} aria-hidden="true"/></span></FieldLabel>
      <CheckboxField label="Require explicit TLS (FTPS)" checked={value.secure} onCheckedChange={checked => field("secure", checked)}/>
    </fieldset></form><StatusMessage tone={tone} aria-label="FTP settings status">{tone==="error"?notice:""}</StatusMessage><HttpPreviewSettings/>
  </section>;
}
export function useWorkspaceFtp() {
  const [items, setItems] = useState<readonly FtpQueueItem[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const actionPending = useRef(false);
  const active = useRef(false);
  const sequence = useRef(0);
  async function refresh() { const token = ++sequence.current; try { const next = await listFtpQueue(); if (active.current && token === sequence.current) { setItems(next); setError(""); } } catch (reason) { if (active.current && token === sequence.current) setError(reason instanceof Error ? reason.message : "Could not load FTP queue."); } }
  useEffect(() => { active.current = true; let live = true; let dispose: (() => void) | undefined;
    if (isTauri()) { void refresh(); void listenFtpQueue(() => { void refresh(); }, message => { if (live) setError(message); }).then(fn => { if (live) { dispose = fn; void refresh(); } else fn(); }).catch(() => { if (live) setError("Live FTP updates unavailable. Refresh the queue to check progress."); }); }
    return () => { live = false; active.current = false; dispose?.(); };
  }, []);
  async function action(run: () => Promise<void>) {
    if (actionPending.current) return;
    actionPending.current = true; if (active.current) setPending(true);
    try { await run(); await refresh(); }
    catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : "FTP operation failed."); }
    finally { actionPending.current = false; if (active.current) setPending(false); }
  }
  return { items, error, pending, refresh, retry: (id: string) => action(() => startFtpUpload(id)), remove: (id: string) => action(() => removeFtpUpload(id)), copy: (url: string) => action(() => copyUploadUrl(url)) };
}

function validFtp(value:FtpSettings){
 try{const url=new URL(value.publicBaseUrl);return !!value.host&&!!value.username&&Number.isInteger(value.port)&&value.port>0&&value.port<=65535&&!!value.remoteDir&&["http:","https:"].includes(url.protocol)&&!!url.hostname&&!url.username&&!url.password&&!url.search&&!url.hash;}catch{return false;}
}
function validHttp(value:PreviewAuth){try{const url=new URL(value.origin);return url.protocol==="https:"&&url.origin===value.origin&&!url.username&&!url.password&&(!value.enabled||!!value.username);}catch{return false;}}
function HttpPreviewSettings(){
 const [value,setValue]=useState<PreviewAuth|null>(null),[password,setPassword]=useState(""),[notice,setNotice]=useState(""),[tone,setTone]=useState<StatusTone>("info");
 const live=useRef(false),latest=useRef<{value:PreviewAuth;password:string}|null>(null);
 const autosave=useSettingsAutosave<{value:PreviewAuth;password:string}>(async snapshot=>{
  const saved=await savePreviewAuth(snapshot.value,snapshot.password||null);
  if(live.current){if(latest.current===snapshot){latest.current={value:saved,password:""};setValue(saved);setPassword("");setTone("success");setNotice("HTTP settings saved.");}}
 },error=>{if(live.current){setTone("error");setNotice(error instanceof Error?error.message:"Could not save HTTP settings.");}});
 function update(next:{value:PreviewAuth;password:string}){latest.current=next;setValue(next.value);setPassword(next.password);setNotice("");autosave.schedule(validHttp(next.value)?next:null);}
 function field(next:Partial<PreviewAuth>){if(latest.current)update({...latest.current,value:{...latest.current.value,...next}});}
 useEffect(()=>{live.current=true;void readPreviewAuth().then(value=>{if(live.current){latest.current={value,password:""};setValue(value);}}).catch(e=>{if(live.current){setTone("error");setNotice(e.message);}});return()=>{live.current=false;};},[]);
 return <section aria-label="HTTPS preview authentication"><h3 className="preference-section-title">HTTPS preview authentication</h3>{value&&<form onSubmit={event=>{event.preventDefault();void autosave.flush().catch(()=>{});}}><fieldset aria-label="HTTP preview authentication"><CheckboxField label="HTTP authentication" checked={value.enabled} onCheckedChange={enabled=>field({enabled})}/><FieldLabel><span>HTTPS origin</span><Input type="url" required aria-label="HTTPS preview origin" placeholder="https://images.example.com" value={value.origin} onChange={e=>field({origin:e.target.value})}/></FieldLabel><FieldLabel><span>HTTP username</span><Input autoComplete="off" aria-label="HTTP username" value={value.username} onChange={e=>field({username:e.target.value})}/></FieldLabel><FieldLabel><span>HTTP password</span><Input type="password" autoComplete="new-password" aria-label="HTTP password" placeholder="Leave blank to keep stored password" value={password} onChange={e=>{if(latest.current)update({...latest.current,password:e.target.value});}}/></FieldLabel></fieldset></form>}<StatusMessage tone={tone} aria-label="HTTP settings status">{tone==="error"?notice:""}</StatusMessage></section>;
}
