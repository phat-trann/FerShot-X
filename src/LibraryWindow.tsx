import {LibraryImagePreview} from "./components/LibraryImagePreview";
import {VideoPreview} from "./features/recording/VideoPreview";
import type {VideoClip,VideoDocument} from "./features/recording/model";
import {formatTime} from "./features/recording/model";
import {listRecordings,readRecording,removeRecording,openRecording,readFtpVideo,editFtpVideo,listenRecording,readRecordingStatus} from "./platform/recording";
import {invoke} from "@tauri-apps/api/core";
import { createPreviewCache } from "./lib/preview-cache";
import { coalesceRefresh } from "./lib/coalesce-refresh";
import {uploadTone} from "./components/ui/status";
import { WindowTitleBar } from "./components/WindowTitleBar";
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from "./components/ui/alert-dialog";
import { useEffect,useRef,useState,useMemo,memo } from "react";
import { Images,Settings2,RefreshCw,ImageOff,Pencil,Copy,RotateCw,Trash2,CloudUpload,Keyboard,ListX,LoaderCircle,Video as VideoIcon } from "lucide-react";
import { Button } from "./components/ui/button";
import {EmptyState,LoadingState} from "./components/ui/content-state";
import {ToolHint} from "./components/ui/tool-hint";
import { Tabs,TabsList,TabsTrigger } from "./components/ui/tabs";
import { listLocalCache,removeLocalCache } from "./platform/local-cache";
import { listFtpQueue,startFtpUpload,removeFtpUpload,copyUploadUrl,deleteFtpRemote,openFtpInBrowser } from "./platform/ftp";
import { copyLibraryImages,readLibraryImage,readLibraryThumbnail,editLibraryImage,listenLibrary,listenEditorOpenResult,type LibraryKind } from "./platform/library";
import { openPreferencesWindow } from "./platform/preferences-window";
import type { LocalCacheEntry,FtpQueueItem } from "./contracts/phase2";
import type { ImageDocument } from "./contracts/media";
import "./Workspace.css";
import "./LibraryWindow.css";
type Row={kind:LibraryKind;id:string;name:string;time:number;size?:number;width?:number;height?:number;upload?:FtpQueueItem;video?:VideoClip;isVideo?:boolean};
const previewKey=(item:FtpQueueItem)=>JSON.stringify([item.id,item.url,item.status,item.updatedAt]);
const key=(row:Row)=>`${row.kind}:${row.id}`;
const bytes=(n:number)=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;
const dateFormatter=new Intl.DateTimeFormat("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"});
let thumbnailChain=Promise.resolve();
const thumbnailCache=new Map<string,{src:string;time:number}>();
const Thumbnail=memo(function Thumbnail({row}:{row:Row}){
 const element=useRef<HTMLSpanElement>(null);const cacheKey=`${row.kind}:${row.id}:${row.size??0}:${row.time}`;const [src,setSrc]=useState(thumbnailCache.get(cacheKey)?.src??"");
 useEffect(()=>{let alive=true,requested=false;const cached=thumbnailCache.get(cacheKey);if(cached&&Date.now()-cached.time<600000){setSrc(cached.src);return;}
 const load=()=>{if(requested)return;requested=true;thumbnailChain=thumbnailChain.then(async()=>{if(!alive)return;const existing=thumbnailCache.get(cacheKey);if(existing&&Date.now()-existing.time<600000){setSrc(existing.src);return;}try{const image=await readLibraryThumbnail(row.kind,row.id);const old=thumbnailCache.get(cacheKey);if(old)URL.revokeObjectURL(old.src);thumbnailCache.delete(cacheKey);while(thumbnailCache.size>=96){const oldest=thumbnailCache.keys().next().value!;URL.revokeObjectURL(thumbnailCache.get(oldest)!.src);thumbnailCache.delete(oldest);}thumbnailCache.set(cacheKey,{src:image.src,time:Date.now()});if(alive)setSrc(image.src);}catch{/* Keep a placeholder for missing/expired images. */}});};
 const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){load();observer.disconnect();}});if(element.current)observer.observe(element.current);return()=>{alive=false;observer.disconnect();};},[cacheKey,row.kind,row.id]);
 return <span className="library-thumbnail" ref={element}>{src?<img src={src} alt="" loading="lazy"/>:<Images size={22} aria-hidden="true"/>}</span>;
},(a,b)=>a.row.kind===b.row.kind&&a.row.id===b.row.id&&a.row.size===b.row.size&&a.row.time===b.row.time);
export default function LibraryWindow(){
 const [tab,setTab]=useState<LibraryKind>("ftp"),[local,setLocal]=useState<readonly LocalCacheEntry[]>([]),[ftp,setFtp]=useState<readonly FtpQueueItem[]>([]),[selected,setSelected]=useState<string|null>(null),[preview,setPreview]=useState<ImageDocument|null>(null),[loading,setLoading]=useState(false),[operationBusy,setBusy]=useState(false),[error,setError]=useState("");
 const [opening,setOpening]=useState<{key:string;requestId:string}|null>(null);
 const openingRef=useRef<typeof opening>(null),openListener=useRef<Promise<()=>void>|null>(null);
 const busy=operationBusy||opening!==null;
 function finishOpening(requestId:string,success:boolean){if(openingRef.current?.requestId!==requestId)return;openingRef.current=null;setOpening(null);if(!success)setError("Edit could not be opened. Retry.");}
 useEffect(()=>{let live=true;let off:(()=>void)|undefined;const listener=listenEditorOpenResult(result=>{if(live)finishOpening(result.requestId,result.success);});openListener.current=listener;void listener.then(fn=>{if(live)off=fn;else fn();}).catch(()=>{});return()=>{live=false;off?.();};},[]);
 useEffect(()=>{if(!opening)return;const timer=setTimeout(()=>{if(openingRef.current?.requestId===opening.requestId){finishOpening(opening.requestId,true);setError("Edit is taking too long. Retry opening the image.");}},30000);return()=>clearTimeout(timer);},[opening]);
 const [recordingError,setRecordingError]=useState("");
 const [videoRevision,setVideoRevision]=useState(0);
 const [videos,setVideos]=useState<readonly VideoClip[]>([]),[videoPreview,setVideoPreview]=useState<VideoClip|null>(null),[videoPreviewDocument,setVideoPreviewDocument]=useState<VideoDocument|null>(null);
 const [previewError,setPreviewError]=useState("");
 const [listing,setListing]=useState(true);
 const [listError,setListError]=useState(false);
 useEffect(()=>{let live=true;let off:(()=>void)|undefined;const receive=(status:Awaited<ReturnType<typeof readRecordingStatus>>)=>{if(!live)return;if(status.phase==="failed"){setTab("local");setRecordingError(status.error==="unsupported_recording"?"Recording requires macOS 15 or later.":"Recording could not finish. Check Local for a recovered video.");}else if(status.phase==="starting"||status.phase==="ready")setRecordingError("");};void listenRecording(receive).then(dispose=>{if(live){off=dispose;void readRecordingStatus().then(receive).catch(()=>{});}else dispose();});return()=>{live=false;off?.();};},[]);

 const collectionLoaded=useRef(false);
 const previewCache=useMemo(()=>createPreviewCache(),[]);
 useEffect(()=>()=>previewCache.clear(),[previewCache]);
 useEffect(()=>{previewCache.retain(new Set(ftp.filter(item=>item.status==="success").map(previewKey)));},[ftp,previewCache]);
 const forceVideoPreview=useRef<string|null>(null);
 const [previewRevision,setPreviewRevision]=useState(0);
 const [pendingDelete,setPendingDelete]=useState<Row[]>([]);
 const [selection,setSelection]=useState<Set<string>>(new Set());const anchor=useRef<string|null>(null);
 const autoPick=useRef(true);
 const alive=useRef(false),readToken=useRef(0),actionPending=useRef(false),refreshToken=useRef(0);
 async function refreshSnapshot(){const token=++refreshToken.current;if(!collectionLoaded.current)setListing(true);try{const [a,b,c]=await Promise.all([listLocalCache(),listFtpQueue(),listRecordings()]);if(alive.current&&token===refreshToken.current){if(!Array.isArray(b))throw new Error("Invalid FTP history.");collectionLoaded.current=true;setLocal(a);setFtp(b);setVideos(c);setVideoRevision(n=>n+1);setError("");setListError(false);}}catch(e){if(alive.current&&token===refreshToken.current){setListError(true);setError(e instanceof Error?e.message:"Library could not be loaded.");}}finally{if(alive.current&&token===refreshToken.current)setListing(false);}}
 const refresh=useMemo(()=>coalesceRefresh(refreshSnapshot),[]);
 useEffect(()=>{alive.current=true;document.title="FerShot X — Library";void refresh();let live=true;const disposers:Array<()=>void>=[];for(const event of ["fershot-library-updated","fershot-ftp-updated"]){void listenLibrary(event,()=>void refresh()).then(off=>{if(live)disposers.push(off);else off();});}const onVisible=()=>{if(!document.hidden)void refresh();};document.addEventListener("visibilitychange",onVisible);const timer=setInterval(()=>{if(!document.hidden)void refresh();},60000);return()=>{alive.current=false;live=false;disposers.forEach(off=>off());document.removeEventListener("visibilitychange",onVisible);clearInterval(timer);};},[]);
 const uploaded=useMemo(()=>new Set(ftp.filter(item=>item.status==="success").map(item=>item.sourceId)),[ftp]);
 const visibleLocal=useMemo(()=>local.filter(entry=>!uploaded.has(entry.id)),[local,uploaded]);
 const rows=useMemo<Row[]>(()=>{const list:Row[]=tab==="local"?[...visibleLocal.map(e=>({kind:"local" as const,id:e.id,name:e.name,time:e.createdAt,size:e.byteSize,width:e.width,height:e.height})),...videos.filter(clip=>!uploaded.has(clip.id)).map(clip=>({kind:"local" as const,id:clip.id,name:clip.name,time:clip.createdAt,size:clip.byteSize,width:clip.width,height:clip.height,video:clip,isVideo:true}))]:ftp.map(e=>({kind:"ftp",id:e.id,name:e.name,time:e.createdAt,upload:e,isVideo:e.remotePath.endsWith(".mp4")}));return list.sort((a,b)=>b.time-a.time);},[tab,visibleLocal,ftp,videos,uploaded]);
 const dates=useMemo(()=>new Map(rows.map(row=>{const date=new Date(row.time);return [row.time,{iso:date.toISOString(),display:dateFormatter.format(date)}];})),[rows]);
 const current=rows.find(row=>key(row)===selected);
 const rowIds=rows.map(key).join("|");
 useEffect(()=>{if(busy||current||(!autoPick.current&&selected===null))return;const retained=rows.filter(row=>selection.has(key(row)));const first=retained[0]??rows[0];if(!first)return;autoPick.current=false;anchor.current=key(first);setSelected(key(first));setSelection(retained.length?new Set(retained.map(key)):new Set([key(first)]));},[tab,rowIds,selected,busy]);
 const cachedPreviewKey=current?.upload?.status==="success"?previewKey(current.upload):null;
 useEffect(()=>{const token=++readToken.current;let owned="";setPreview(null);setVideoPreview(null);setVideoPreviewDocument(null);setPreviewError("");if(!current){setLoading(false);return;}
 if(current.isVideo){setLoading(true);void (current.video?readRecording(current.id).then(document=>({clip:document.clip,document})):readFtpVideo(current.id,forceVideoPreview.current===key(current)).then(clip=>({clip,document:null}))).then(({clip,document})=>{if(alive.current&&token===readToken.current){setVideoPreview(clip);setVideoPreviewDocument(document);}}).catch(error=>{if(alive.current&&token===readToken.current)setPreviewError(error.message??"Video preview unavailable.");}).finally(()=>{if(alive.current&&token===readToken.current)setLoading(false);});return()=>{readToken.current++;};}
 const cached=cachedPreviewKey?previewCache.get(cachedPreviewKey):null;
 if(cached){owned=cached.src;setPreview(cached);setLoading(false);}
 else {setLoading(true);const read=()=>readLibraryImage(current.kind,current.id);void (cachedPreviewKey?previewCache.load(cachedPreviewKey,read):read()).then(image=>{if(!alive.current||token!==readToken.current){URL.revokeObjectURL(image.src);return;}owned=image.src;setPreview(image);}).catch(e=>{if(alive.current&&token===readToken.current)setPreviewError(e instanceof Error?e.message:"Preview unavailable.");}).finally(()=>{if(alive.current&&token===readToken.current)setLoading(false);});}
 return()=>{readToken.current++;if(owned)URL.revokeObjectURL(owned);};},[selected,current?.id,cachedPreviewKey,previewRevision,previewCache,current?.video?videoRevision:0]);
 function refreshPreviews(){forceVideoPreview.current=current?key(current):null;previewCache.clear();setPreviewRevision(n=>n+1);void refresh();}

 async function run(operation:()=>Promise<unknown>,update=false){if(actionPending.current||openingRef.current)return;actionPending.current=true;setBusy(true);setError("");try{await operation();if(update)await refresh();}catch(e){if(alive.current)setError(e instanceof Error?e.message:"Library action failed.");}finally{actionPending.current=false;if(alive.current)setBusy(false);}}
 async function openEdit(row:Row){const request={key:key(row),requestId:crypto.randomUUID()};openingRef.current=request;setOpening(request);try{await openListener.current;if(row.video)await openRecording(row.id,request.requestId);else if(row.isVideo)await editFtpVideo(row.id,request.requestId);else await editLibraryImage(row.kind,row.id,request.requestId);}catch(error){finishOpening(request.requestId,true);throw error;}}
 const selectedRows=rows.filter(row=>selection.has(key(row)));
 const selectionBusy=selectedRows.some(row=>row.upload?.status==="uploading");
 function choose(row:Row,extend=false,toggle=false){if(busy)return;const id=key(row);let next=new Set<string>();if(extend&&anchor.current&&rows.some(r=>key(r)===anchor.current)){const a=rows.findIndex(r=>key(r)===anchor.current),b=rows.indexOf(row);next=new Set(rows.slice(Math.min(a,b),Math.max(a,b)+1).map(key));}else if(toggle){next=new Set(selection);if(next.has(id))next.delete(id);else next.add(id);anchor.current=id;}else{next.add(id);anchor.current=id;}setSelection(next);setSelected(next.has(id)?id:rows.find(r=>next.has(key(r)))?key(rows.find(r=>next.has(key(r)))!):null);}
 async function copySelection(){if(!selectedRows.length)return;if(tab==="ftp")await copyUploadUrl([...selectedRows].sort((a,b)=>a.time-b.time).map(row=>row.upload!.url).join("\n"));else if(selectedRows.some(row=>row.isVideo)){if(selectedRows.length!==1)throw new Error("Copy videos individually. Multiple images can be copied together.");await invoke("recording_copy_library",{id:selectedRows[0].id});}else await copyLibraryImages([...selectedRows].sort((a,b)=>a.time-b.time).map(row=>row.id));}
 async function removeSelection(remote=false){const targets=remote?pendingDelete:selectedRows;try{for(const row of targets){if(remote)await deleteFtpRemote(row.id);else if(row.video)await removeRecording(row.id);else if(row.kind==="local")await removeLocalCache(row.id);else await removeFtpUpload(row.id);setSelection(old=>{const next=new Set(old);next.delete(key(row));return next;});if(selected===key(row))autoPick.current=true;setSelected(old=>old===key(row)?null:old);}}finally{setPendingDelete([]);await refresh();}}
 function deleteSelection(){if(busy||selectionBusy||!selectedRows.length)return;if(tab==="ftp")setPendingDelete(selectedRows);else void run(()=>removeSelection());}
 useEffect(()=>{
  const blocked=(event:Event)=>{
   if(event.defaultPrevented||document.hidden||pendingDelete.length||document.querySelector('[aria-modal="true"]'))return true;
   const target=event.target instanceof Element?event.target:document.activeElement;
   return target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
  };
  const copy=(event:Event)=>{if(blocked(event)||!selectedRows.length)return;event.preventDefault();if(!busy)void run(copySelection);};
  const keydown=(event:KeyboardEvent)=>{
   if(blocked(event)||event.repeat||event.isComposing)return;
   const modified=event.metaKey||event.ctrlKey,pressed=event.key.toLowerCase();
   if(modified&&!event.altKey&&!event.shiftKey&&pressed==="a"){event.preventDefault();if(!busy){setSelection(new Set(rows.map(key)));setSelected(selected??(rows[0]?key(rows[0]):null));}}
   else if(modified&&!event.altKey&&!event.shiftKey&&pressed==="c")copy(event);
   else if(!event.altKey&&["Backspace","Delete"].includes(event.key)&&selectedRows.length){event.preventDefault();deleteSelection();}
  };
  // Native Edit > Copy in WKWebView can dispatch copy without a keydown event.
  window.addEventListener("keydown",keydown);window.addEventListener("copy",copy);
  return()=>{window.removeEventListener("keydown",keydown);window.removeEventListener("copy",copy);};
 });
 function selectTab(value:string){if(busy)return;autoPick.current=true;setTab(value as LibraryKind);setSelected(null);setSelection(new Set());anchor.current=null;setError("");}
 return <main className="library-window" aria-label="Library">
  <WindowTitleBar section="Library"/>
  <aside className="library-sidebar" aria-label="Library list">
   <Tabs value={tab} onValueChange={selectTab}><TabsList className="library-tabs" aria-label="Library source"><TabsTrigger value="local">Local <span>{rows.length&&tab==="local"?rows.length:visibleLocal.length+videos.filter(clip=>!uploaded.has(clip.id)).length}</span></TabsTrigger><TabsTrigger value="ftp">FTP <span>{ftp.length}</span></TabsTrigger></TabsList></Tabs>
   <div className="library-rows" role="listbox" aria-busy={listing} aria-multiselectable="true" aria-label={`${tab==="local"?"Local":"FTP"} images`}>
    {rows.map((row,index)=><Button variant="plain" type="button" key={key(row)} className="library-row" role="option" aria-busy={opening?.key===key(row)} aria-selected={selection.has(key(row))} aria-current={selection.has(key(row))?"true":undefined} onClick={event=>choose(row,event.shiftKey,event.metaKey||event.ctrlKey)} onDoubleClick={()=>void run(()=>row.kind==="local"?openEdit(row):openFtpInBrowser(row.id))} onKeyDown={event=>{if(["ArrowDown","ArrowUp","Home","End"].includes(event.key)){event.preventDefault();const next=event.key==="Home"?0:event.key==="End"?rows.length-1:(index+(event.key==="ArrowDown"?1:-1)+rows.length)%rows.length;choose(rows[next]!,event.shiftKey);(event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();}}}>
     <span className="library-row-thumbnail">{row.video?<span className="library-thumbnail">{row.video.poster?<img src={row.video.poster} alt="" loading="lazy"/>:<VideoIcon size={22} aria-hidden="true"/>}</span>:<Thumbnail row={row}/>}{opening?.key===key(row)&&<span className="library-row-opening"><LoadingState>Opening image in Edit</LoadingState></span>}</span><span className="library-row-info"><strong>{row.upload?row.upload.remotePath:row.name}</strong><span>{row.upload?<>{row.name} · <span className="status-badge" data-tone={uploadTone(row.upload.status)}>{row.upload.status}</span></>:`${row.width} × ${row.height} · ${row.video?`${formatTime(row.video.durationMs)} · `:""}${bytes(row.size??0)}`}</span><time dateTime={dates.get(row.time)!.iso}>{dates.get(row.time)!.display}</time></span>{row.upload&&<CloudUpload size={15} aria-hidden="true"/>}
    </Button>)}
    {!rows.length&&(listing?<LoadingState>Loading library…</LoadingState>:listError?null:<div className="library-empty"><p>{tab==="local"?"No local images.":"No uploads."}</p></div>)}
   </div>{selectedRows.length>0&&<div className="library-bulk-actions" role="group" aria-label="Selected images"><span>{selectedRows.length} selected</span><ToolHint label={tab==="ftp"?"Copy Links":"Copy Images"} shortcut="⌘C"><Button variant="outline" size="icon" aria-label={tab==="ftp"?"Copy links":"Copy images"} disabled={busy} onClick={()=>void run(copySelection)}><Copy size={16}/></Button></ToolHint>{tab==="ftp"&&<ToolHint label="Remove History"><Button icon={ListX} variant="warning" size="icon" aria-label="Remove history" disabled={busy||selectionBusy} onClick={()=>void run(()=>removeSelection())}/></ToolHint>}<ToolHint label={tab==="ftp"?"Delete Selected From FTP":"Delete Selected"} shortcut="⌫"><Button aria-label={tab==="ftp"?"Delete selected from FTP":"Delete selected"} variant="destructive" size="icon" disabled={busy||selectionBusy} onClick={deleteSelection}><Trash2 size={16}/></Button></ToolHint></div>}<footer><span>{tab==="local"?"Retained for 30 days":""}</span><Button variant="ghost" size="icon" aria-label="Settings" onClick={()=>void run(()=>openPreferencesWindow())}><Settings2 size={16}/></Button></footer>
  </aside>
  <section className="library-detail" aria-label="Image preview" aria-busy={listing||loading||!!opening}>
   <header><div><h2>{current?.name??(rows.length?"Select an image":tab==="ftp"?"FTP uploads":"Local images")}</h2><span className="library-image-metrics" aria-label="Image dimensions and file size">{videoPreview?`${videoPreview.width} × ${videoPreview.height} · ${formatTime(videoPreview.durationMs)} · ${bytes(videoPreview.byteSize)}`:preview?`${preview.width} × ${preview.height} · ${bytes(preview.byteSize)}`:current?.width&&current?.height?`${current.width} × ${current.height} · ${bytes(current.size??0)}`:"\u00a0"}</span></div>{current&&<ToolHint label="Edit Image"><Button icon={opening?LoaderCircle:Pencil} className={opening?"library-edit-opening":undefined} size="icon" aria-label="Edit image" aria-busy={!!opening} disabled={busy} onClick={()=>void run(()=>openEdit(current))}/></ToolHint>}<ToolHint label="Refresh Library"><Button variant="ghost" size="icon" aria-label="Refresh library" disabled={busy||listing} onClick={refreshPreviews}><RefreshCw size={16}/></Button></ToolHint></header>
   {(error||previewError||recordingError)&&<div className="library-error"><p role="alert">{error||previewError||recordingError}</p>{current&&previewError&&<Button icon={RefreshCw} variant="outline" size="sm" disabled={loading} onClick={()=>setPreviewRevision(n=>n+1)}>Retry preview</Button>}<Button icon={Settings2} variant="ghost" size="sm" onClick={()=>void openPreferencesWindow()}>Open Settings</Button></div>}
   <div className="library-preview">{opening&&<div className="library-opening-overlay"><LoadingState>Opening image in Edit</LoadingState></div>}{listing?<LoadingState>Loading library…</LoadingState>:loading?<LoadingState>Loading preview…</LoadingState>:videoPreview?<VideoPreview key={`${videoPreview.id}:${previewRevision}:${current?.video?videoRevision:0}`} clip={videoPreview} document={videoPreviewDocument}/>:preview?<LibraryImagePreview key={selected??preview.id} image={preview} name={current?.name??"Selected image"}/>:current?<EmptyState icon={ImageOff} title="This preview is unavailable."/>:rows.length?<EmptyState icon={Images} title="Select an image."/>:listError?<EmptyState icon={ImageOff} title="Refresh to load your library." action={<Button icon={RefreshCw} onClick={()=>void refresh()}>Retry Library</Button>}/>:<EmptyState icon={tab==="ftp"?CloudUpload:Images} title={tab==="ftp"?"No FTP uploads yet.":"Capture an image from the menu bar."} action={<Button icon={tab==="ftp"?Settings2:Keyboard} onClick={()=>void run(()=>openPreferencesWindow(tab==="ftp"?"uploading":"hotkeys"))}>{tab==="ftp"?"Set Up FTP":"Set Up Shortcuts"}</Button>}/>}</div>
   {current&&<footer className="library-metadata"><div>{current.upload?<><strong className="status-badge" data-tone={uploadTone(current.upload.status)}>{current.upload.status}</strong><output title={current.upload.remotePath}>{current.upload.remotePath}</output>{current.upload.error&&<p role="alert" title={current.upload.error}>{current.upload.error}</p>}</>:<span>Captured {dateFormatter.format(new Date(current.time))} · Local cache</span>}</div>{current.upload&&["failed","pending"].includes(current.upload.status)&&<div className="library-detail-actions" role="group" aria-label="Image actions"><Button variant="outline" size="sm" disabled={busy} onClick={()=>void run(()=>startFtpUpload(current.id),true)}><RotateCw size={14}/>Retry upload</Button></div>}</footer>}
  </section>
 <AlertDialog open={pendingDelete.length>0} onOpenChange={open=>{if(!open)setPendingDelete([]);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete image from FTP?</AlertDialogTitle><AlertDialogDescription>Permanently delete {pendingDelete.length===1?pendingDelete[0]?.upload?.remotePath:`${pendingDelete.length} images`} from FTP?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction data-variant="destructive" onClick={()=>{void run(()=>removeSelection(true));}}>Delete permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </main>;
}
