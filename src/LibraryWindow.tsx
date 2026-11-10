import { WindowTitleBar } from "./components/WindowTitleBar";
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from "./components/ui/alert-dialog";
import { useEffect,useRef,useState } from "react";
import { Images,Settings2,RefreshCw,ImageOff,Pencil,Copy,RotateCw,Trash2,CloudUpload } from "lucide-react";
import { Button } from "./components/ui/button";
import { Tabs,TabsList,TabsTrigger } from "./components/ui/tabs";
import { listLocalCache,removeLocalCache } from "./platform/local-cache";
import { listFtpQueue,startFtpUpload,removeFtpUpload,copyUploadUrl,deleteFtpRemote,openFtpInBrowser } from "./platform/ftp";
import { readLibraryImage,readLibraryThumbnail,editLibraryImage,listenLibrary,type LibraryKind } from "./platform/library";
import { openPreferencesWindow } from "./platform/preferences-window";
import type { LocalCacheEntry,FtpQueueItem } from "./contracts/phase2";
import type { ImageDocument } from "./contracts/media";
import "./Workspace.css";
import "./LibraryWindow.css";
type Row={kind:LibraryKind;id:string;name:string;time:number;size?:number;width?:number;height?:number;upload?:FtpQueueItem};
const key=(row:Row)=>`${row.kind}:${row.id}`;
const bytes=(n:number)=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;
let thumbnailChain=Promise.resolve();
const thumbnailCache=new Map<string,{src:string;time:number}>();
function Thumbnail({row}:{row:Row}){
 const element=useRef<HTMLSpanElement>(null);const cacheKey=`${row.kind}:${row.id}:${row.size??0}:${row.time}`;const [src,setSrc]=useState(thumbnailCache.get(cacheKey)?.src??"");
 useEffect(()=>{let alive=true,requested=false;const cached=thumbnailCache.get(cacheKey);if(cached&&Date.now()-cached.time<600000){setSrc(cached.src);return;}
 const load=()=>{if(requested)return;requested=true;thumbnailChain=thumbnailChain.then(async()=>{if(!alive)return;const existing=thumbnailCache.get(cacheKey);if(existing&&Date.now()-existing.time<600000){setSrc(existing.src);return;}try{const image=await readLibraryThumbnail(row.kind,row.id);const old=thumbnailCache.get(cacheKey);if(old)URL.revokeObjectURL(old.src);thumbnailCache.delete(cacheKey);while(thumbnailCache.size>=96){const oldest=thumbnailCache.keys().next().value!;URL.revokeObjectURL(thumbnailCache.get(oldest)!.src);thumbnailCache.delete(oldest);}thumbnailCache.set(cacheKey,{src:image.src,time:Date.now()});if(alive)setSrc(image.src);}catch{/* Keep a placeholder for missing/expired images. */}});};
 const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){load();observer.disconnect();}});if(element.current)observer.observe(element.current);return()=>{alive=false;observer.disconnect();};},[cacheKey,row.kind,row.id]);
 return <span className="library-thumbnail" ref={element}>{src?<img src={src} alt="" loading="lazy"/>:<Images size={22} aria-hidden="true"/>}</span>;
}
export default function LibraryWindow(){
 const [tab,setTab]=useState<LibraryKind>("ftp"),[local,setLocal]=useState<readonly LocalCacheEntry[]>([]),[ftp,setFtp]=useState<readonly FtpQueueItem[]>([]),[selected,setSelected]=useState<string|null>(null),[preview,setPreview]=useState<ImageDocument|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [previewRevision,setPreviewRevision]=useState(0);
 const [pendingDelete,setPendingDelete]=useState<Row|null>(null);
 const alive=useRef(false),readToken=useRef(0),actionPending=useRef(false),refreshToken=useRef(0);
 async function refresh(){const token=++refreshToken.current;try{const [a,b]=await Promise.all([listLocalCache(),listFtpQueue()]);if(alive.current&&token===refreshToken.current){if(!Array.isArray(b))throw new Error("Invalid FTP history.");setLocal(a);setFtp(b);setError("");}}catch(e){if(alive.current&&token===refreshToken.current)setError(e instanceof Error?e.message:"Library could not be loaded.");}}
 useEffect(()=>{alive.current=true;document.title="FerShot X — Library";void refresh();let live=true;const disposers:Array<()=>void>=[];for(const event of ["fershot-library-updated","fershot-ftp-updated"]){void listenLibrary(event,()=>void refresh()).then(off=>{if(live)disposers.push(off);else off();});}const timer=setInterval(()=>void refresh(),60000);return()=>{alive.current=false;live=false;disposers.forEach(off=>off());clearInterval(timer);};},[]);
 const uploaded=new Set(ftp.filter(item=>item.status==="success").map(item=>item.sourceId));
 const rows:Row[]=tab==="local"?local.filter(entry=>!uploaded.has(entry.id)).map(e=>({kind:"local",id:e.id,name:e.name,time:e.createdAt,size:e.byteSize,width:e.width,height:e.height})):ftp.map(e=>({kind:"ftp",id:e.id,name:e.name,time:e.createdAt,upload:e}));
 rows.sort((a,b)=>b.time-a.time);const filtered=rows;const current=rows.find(row=>key(row)===selected);
 useEffect(()=>{const token=++readToken.current;let owned="";setPreview(null);if(!current){setLoading(false);return;}setLoading(true);setError("");void readLibraryImage(current.kind,current.id).then(image=>{if(!alive.current||token!==readToken.current){URL.revokeObjectURL(image.src);return;}owned=image.src;setPreview(image);}).catch(e=>{if(alive.current&&token===readToken.current)setError(e instanceof Error?e.message:"Preview unavailable.");}).finally(()=>{if(alive.current&&token===readToken.current)setLoading(false);});return()=>{readToken.current++;if(owned)URL.revokeObjectURL(owned);};},[selected,current?.id,current?.upload?.updatedAt,previewRevision]);
 async function run(operation:()=>Promise<unknown>,update=false){if(actionPending.current)return;actionPending.current=true;setBusy(true);setError("");try{await operation();if(update)await refresh();}catch(e){if(alive.current)setError(e instanceof Error?e.message:"Library action failed.");}finally{actionPending.current=false;if(alive.current)setBusy(false);}}
 function selectTab(value:string){setTab(value as LibraryKind);setSelected(null);setError("");}
 return <main className="library-window" aria-label="Library">
  <WindowTitleBar section="Library"/>
  <aside className="library-sidebar" aria-label="Library list">
   <Tabs value={tab} onValueChange={selectTab}><TabsList className="library-tabs" aria-label="Library source"><TabsTrigger value="local">Local <span>{local.filter(e=>!uploaded.has(e.id)).length}</span></TabsTrigger><TabsTrigger value="ftp">FTP <span>{ftp.length}</span></TabsTrigger></TabsList></Tabs>
   <div className="library-rows" role="listbox" aria-label={`${tab==="local"?"Local":"FTP"} images`}>
    {filtered.map((row,index)=><button type="button" key={key(row)} className="library-row" role="option" aria-selected={selected===key(row)} aria-current={selected===key(row)?"true":undefined} onClick={()=>setSelected(key(row))} onDoubleClick={()=>void run(()=>row.kind==="local"?editLibraryImage("local",row.id):openFtpInBrowser(row.id))} onKeyDown={event=>{if(["ArrowDown","ArrowUp","Home","End"].includes(event.key)){event.preventDefault();const next=event.key==="Home"?0:event.key==="End"?filtered.length-1:(index+(event.key==="ArrowDown"?1:-1)+filtered.length)%filtered.length;setSelected(key(filtered[next]!));(event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();}}}>
     <Thumbnail row={row}/><span className="library-row-info"><strong>{row.upload?row.upload.remotePath:row.name}</strong><span>{row.upload?`${row.name} · ${row.upload.status}`:`${row.width} × ${row.height} · ${bytes(row.size??0)}`}</span><time dateTime={new Date(row.time).toISOString()}>{new Date(row.time).toLocaleString("en-GB")}</time></span>{row.upload&&<CloudUpload size={15} aria-hidden="true"/>}
    </button>)}
    {!filtered.length&&<div className="library-empty"><Images size={28}/><p>{tab==="local"?"Your saved and copied captures appear here.":"Uploaded and queued images appear here."}</p></div>}
   </div><footer><span>{tab==="local"?"Local copies retained for 30 days":"Uploads keep their original URL on retry"}</span><Button variant="ghost" size="icon" aria-label="Settings" onClick={()=>void run(()=>openPreferencesWindow())}><Settings2 size={16}/></Button></footer>
  </aside>
  <section className="library-detail" aria-label="Image preview">
   <header><div><h2>{current?.name??"Select an image"}</h2><span>{preview?`${preview.width} × ${preview.height} · ${bytes(preview.byteSize)}`:"Preview your library, then open Edit to make changes."}</span></div><Button disabled={!preview||busy||loading} onClick={()=>current&&void run(()=>editLibraryImage(current.kind,current.id))}><Pencil size={16}/>Edit image</Button><Button variant="ghost" size="icon" aria-label="Refresh library" title="Refresh Library" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16}/></Button></header>
   {error&&<div className="library-error"><p role="alert">{error}</p>{current&&<Button variant="outline" size="sm" disabled={loading} onClick={()=>setPreviewRevision(n=>n+1)}>Retry preview</Button>}<Button variant="ghost" size="sm" onClick={()=>void openPreferencesWindow()}>Open Settings</Button></div>}
   <div className="library-preview">{loading?<p role="status">Loading preview…</p>:preview?<img src={preview.src} alt={current?.name??"Selected image"}/>:<div className="library-empty"><ImageOff size={40}/><p>{current?"This preview is unavailable.":"Select a row on the left to preview it."}</p></div>}</div>
   {current&&<footer className="library-metadata"><div>{current.upload?<><strong>{current.upload.status}</strong><output>{current.upload.remotePath}</output>{current.upload.error&&<p role="alert">{current.upload.error}</p>}</>:<span>Captured {new Date(current.time).toLocaleString("en-GB")} · Local cache</span>}</div><div className="library-detail-actions">{current.upload&&<><Button variant="outline" size="sm" disabled={busy} onClick={()=>void run(()=>copyUploadUrl(current.upload!.url))}><Copy size={14}/>Copy URL</Button>{["failed","pending"].includes(current.upload.status)&&<Button variant="outline" size="sm" disabled={busy} onClick={()=>void run(()=>startFtpUpload(current.id),true)}><RotateCw size={14}/>Retry upload</Button>}<Button variant="destructive" size="sm" disabled={busy||current.upload.status==="uploading"} onClick={()=>setPendingDelete(current)}><Trash2 size={14}/>Delete from FTP</Button></>}<Button variant="ghost" size="sm" disabled={busy||current.upload?.status==="uploading"} onClick={()=>void run(async()=>{if(current.kind==="local")await removeLocalCache(current.id);else await removeFtpUpload(current.id);setSelected(null);},true)}><Trash2 size={14}/>{current.kind==="local"?"Remove cached copy":"Remove history"}</Button></div></footer>}
  </section>
 <AlertDialog open={!!pendingDelete} onOpenChange={open=>{if(!open)setPendingDelete(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete image from FTP?</AlertDialogTitle><AlertDialogDescription>This permanently deletes {pendingDelete?.upload?.remotePath} from the FTP server and removes its local thumbnail/history. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={()=>{const id=pendingDelete?.id;if(id)void run(async()=>{await deleteFtpRemote(id);setSelected(null);setPendingDelete(null);},true);}}>Delete permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </main>;
}
