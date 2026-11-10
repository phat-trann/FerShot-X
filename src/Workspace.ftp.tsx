import { Switch } from "./components/ui/switch";
import { Button } from "./components/ui/button";
import { readPreviewAuth,savePreviewAuth,type PreviewAuth } from "./platform/ftp";
import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type { FtpQueueItem, FtpSettings } from "./contracts/phase2";
import { copyUploadUrl, listFtpQueue, listenFtpQueue, readFtpSettings, removeFtpUpload, saveFtpSettings, startFtpUpload } from "./platform/ftp";
import { Input } from "./components/ui/input";
import { NativeSelect } from "./components/ui/select";
const DEFAULT: FtpSettings = { host: "", port: 21, username: "", remoteDir: "/s", monthlyFolders: false, publicBaseUrl: "", secure: false, namingMode: "random" };
export function WorkspaceFtpSettings({ expanded = false }: { expanded?: boolean } = {}) {
  const [value, setValue] = useState(DEFAULT);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; let live = true;
    if (!isTauri()) { setNotice("FTP settings are available in the desktop app."); return () => { mounted.current = false; }; }
    void readFtpSettings().then(settings => { if (live) { if (settings) setValue({ ...DEFAULT, ...settings }); setReady(true); } }).catch(error => { if (live) setNotice(error.message); });
    return () => { live = false; mounted.current = false; };
  }, []);
  const date=new Date();const monthFolder=`${String(date.getFullYear()%100).padStart(2,"0")}${String(date.getMonth()+1).padStart(2,"0")}`;
  const folder=`${value.remoteDir.replace(/\/+$/,"")}${value.monthlyFolders?`/${monthFolder}`:""}`||"/";
  const field = (key: keyof FtpSettings, next: string | number | boolean) => setValue(old => ({ ...old, [key]: next }));
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (pending || !ready) return; setPending(true); setNotice("");
    try { const saved = await saveFtpSettings(value, password || null); if (mounted.current) { setValue(saved); setPassword(""); setNotice("FTP settings saved. Existing queued uploads keep their original destination."); } }
    catch (error) { if (mounted.current) setNotice(error instanceof Error ? error.message : "Could not save FTP settings."); }
    finally { if (mounted.current) setPending(false); }
  }
  return <section aria-label="FTP publishing settings"><details open={expanded || undefined}><summary>FTP publishing</summary><p>Upload edited captures with ⌘S. The public URL appears before the transfer finishes.</p>
    <form onSubmit={event => { void save(event); }}><fieldset disabled={pending || !ready}>
      <label>FTP host<Input required autoComplete="off" value={value.host} onChange={event => field("host", event.target.value)} placeholder="ftp.example.com" /></label>
      <label>Port<Input required type="number" min="1" max="65535" value={value.port} onChange={event => field("port", Number(event.target.value))} /></label>
      <label>Username<Input required autoComplete="off" value={value.username} onChange={event => field("username", event.target.value)} /></label>
      <p>Your password is stored separately in FerShot X’s own macOS Keychain entry.</p>
      <label>Password<Input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Leave blank to keep your FerShot X password" /></label>
      <label>User folder<Input aria-label="User folder" required value={value.remoteDir} onChange={event => field("remoteDir", event.target.value)} placeholder="/s" /></label>
      <label>Group uploads by month<Switch aria-label="Group uploads by month" checked={!!value.monthlyFolders} onCheckedChange={enabled=>field("monthlyFolders",enabled)}/></label>
      <p>Remote folder: <output aria-label="Remote folder preview">{folder}</output>. {value.monthlyFolders?"Adds a YYMM folder using the local upload date, for example 2611 for November 2026.":"Uploads go directly into your user folder."}</p>
      <label>Public base URL<Input required type="url" value={value.publicBaseUrl} onChange={event => field("publicBaseUrl", event.target.value)} placeholder="https://cdn.example.com" /></label>
      <p>URL = public base URL + remote folder + allocated filename.</p>
      <label>Upload filename<NativeSelect aria-label="Upload filename" value={value.namingMode} onChange={event => field("namingMode", event.target.value)}>
        <option value="random">Random (current)</option>
        <option value="timestamp">Timestamp (DDHHmmssN)</option>
      </NativeSelect></label>
      <p>{value.namingMode === "timestamp" ? "Uses local snapshot time: day, hour, minute, second and a sequence digit. Example: 091234560.png." : "Allocates a unique screenshot filename, as before."} Changing this affects new uploads only; queued URLs and retries keep their names.</p>
      <label><Switch  checked={value.secure} onCheckedChange={checked => field("secure", checked)} />Require explicit TLS (FTPS)</label>
      {!value.secure && <p>Plain FTP sends credentials without transport encryption.</p>}
      <button type="submit">{pending ? "Saving…" : "Save FTP settings"}</button>
    </fieldset></form><p role="status" aria-label="FTP settings status">{notice}</p><HttpPreviewSettings/></details>
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

function HttpPreviewSettings(){
 const [value,setValue]=useState<PreviewAuth|null>(null),[password,setPassword]=useState(""),[pending,setPending]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{let live=true;void readPreviewAuth().then(value=>{if(live)setValue(value);}).catch(e=>{if(live)setNotice(e.message);});return()=>{live=false;};},[]);
 return <section aria-label="HTTPS preview authentication"><h3>HTTPS preview authentication</h3><p>Separate HTTP Basic credentials for protected image URLs. Imported once from the uploader when available; passwords stay in FerShot X Keychain.</p>{value&&<form onSubmit={event=>{event.preventDefault();if(pending)return;setPending(true);void savePreviewAuth(value,password||null).then(saved=>{setValue(saved);setPassword("");setNotice("HTTP settings saved. Retry the image preview in Library.");}).catch(e=>setNotice(e.message)).finally(()=>setPending(false));}}><fieldset disabled={pending}><label>HTTP authentication<Switch checked={value.enabled} onCheckedChange={enabled=>setValue({...value,enabled})}/></label><label>HTTPS origin<Input type="url" required aria-label="HTTPS preview origin" placeholder="https://images.example.com" value={value.origin} onChange={e=>setValue({...value,origin:e.target.value})}/></label><label>HTTP username<Input autoComplete="off" aria-label="HTTP username" value={value.username} onChange={e=>setValue({...value,username:e.target.value})}/></label><label>HTTP password<Input type="password" autoComplete="new-password" aria-label="HTTP password" placeholder="Leave blank to keep stored password" value={password} onChange={e=>setPassword(e.target.value)}/></label><p>Credentials apply only to this exact HTTPS origin. Authenticated redirects are not followed.</p><Button type="submit">{pending?"Saving…":"Save HTTP settings"}</Button></fieldset></form>}<p role="status" aria-label="HTTP settings status">{notice}</p></section>;
}
