import {supportsLiveText,type LiveTextState} from "./platform/live-text";
import {Toggle} from "./components/ui/toggle";
import {LibraryImagePreview} from "./components/LibraryImagePreview";
import {VideoPreview} from "./features/recording/VideoPreview";
import type {VideoClip,VideoDocument} from "./features/recording/model";
import {formatTime} from "./features/recording/model";
import {listRecordings,readRecording,releaseRecordingPreview,removeRecording,openRecording,readFtpVideo,editFtpVideo,listenRecording,readRecordingStatus} from "./platform/recording";
import {invoke} from "./platform/ipc";
import { createPreviewCache } from "./lib/preview-cache";
import { coalesceRefresh } from "./lib/coalesce-refresh";
import {StatusMessage,uploadTone} from "./components/ui/status";
import { WindowTitleBar } from "./components/WindowTitleBar";
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from "./components/ui/alert-dialog";
import { useEffect,useRef,useState,useMemo,memo } from "react";
import { Images,Settings2,RefreshCw,ImageOff,Pencil,Copy,RotateCw,Trash2,CloudUpload,Keyboard,ListX,LoaderCircle,ScanText,Video as VideoIcon } from "lucide-react";
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
type Row={revision?:string;kind:LibraryKind;id:string;name:string;time:number;size?:number;width?:number;height?:number;upload?:FtpQueueItem;video?:VideoClip;isVideo?:boolean};
type LibrarySource = "local" | "video" | "ftp";
type PreviewResult =
 | {key:string;image:ImageDocument}
 | {key:string;clip:VideoClip;document:VideoDocument|null}
 | {key:string;error:string};
const previewKey=(item:FtpQueueItem)=>JSON.stringify([item.id,item.url,item.status,item.updatedAt]);
const key=(row:Row)=>`${row.kind}:${row.id}`;
const bytes=(n:number)=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;
const dateFormatter=new Intl.DateTimeFormat("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"});
let thumbnailChain=Promise.resolve();
const thumbnailCache=new Map<string,{src:string;time:number}>();
const Thumbnail=memo(function Thumbnail({row}:{row:Row}){
 const element=useRef<HTMLSpanElement>(null);const cacheKey=`${row.kind}:${row.id}:${row.size??0}:${row.time}:${row.revision??""}`;const [src,setSrc]=useState(thumbnailCache.get(cacheKey)?.src??"");
 useEffect(()=>{let alive=true,requested=false;const cached=thumbnailCache.get(cacheKey);if(cached&&Date.now()-cached.time<600000){setSrc(cached.src);return;}
 const load=()=>{if(requested)return;requested=true;thumbnailChain=thumbnailChain.then(async()=>{if(!alive)return;const existing=thumbnailCache.get(cacheKey);if(existing&&Date.now()-existing.time<600000){setSrc(existing.src);return;}try{const image=await readLibraryThumbnail(row.kind,row.id);const old=thumbnailCache.get(cacheKey);if(old)URL.revokeObjectURL(old.src);thumbnailCache.delete(cacheKey);while(thumbnailCache.size>=96){const oldest=thumbnailCache.keys().next().value!;URL.revokeObjectURL(thumbnailCache.get(oldest)!.src);thumbnailCache.delete(oldest);}thumbnailCache.set(cacheKey,{src:image.src,time:Date.now()});if(alive)setSrc(image.src);}catch{/* Keep a placeholder for missing/expired images. */}});};
 const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){load();observer.disconnect();}});if(element.current)observer.observe(element.current);return()=>{alive=false;observer.disconnect();};},[cacheKey,row.kind,row.id]);
 return <span className="library-thumbnail" ref={element}>{src?<img src={src} alt="" loading="lazy"/>:<Images size={22} aria-hidden="true"/>}</span>;
},(a,b)=>a.row.kind===b.row.kind&&a.row.id===b.row.id&&a.row.size===b.row.size&&a.row.time===b.row.time&&a.row.revision===b.row.revision);
export default function LibraryWindow(){
 const [tab,setTab]=useState<LibraryKind>("ftp"),[local,setLocal]=useState<readonly LocalCacheEntry[]>([]),[ftp,setFtp]=useState<readonly FtpQueueItem[]>([]),[selected,setSelected]=useState<string|null>(null),[operationBusy,setBusy]=useState(false),[error,setError]=useState("");
 const activeTab=useRef<LibraryKind>("ftp");
 const [opening,setOpening]=useState<{key:string;requestId:string}|null>(null);
 const openingRef=useRef<typeof opening>(null),openListener=useRef<Promise<()=>void>|null>(null);
 const busy=operationBusy||opening!==null;
 const [liveTextAvailable,setLiveTextAvailable]=useState(false),[liveTextId,setLiveTextId]=useState<string|null>(null),[liveTextState,setLiveTextState]=useState<LiveTextState>("idle");
 const liveText=liveTextId!==null&&liveTextId===selected;
 function setLiveText(enabled:boolean){setLiveTextId(enabled?selected:null);}
 useEffect(()=>{let live=true;void supportsLiveText().then(value=>{if(live)setLiveTextAvailable(value);}).catch(()=>{});return()=>{live=false;};},[]);
 useEffect(()=>{setLiveText(false);setLiveTextState("idle");},[selected]);
 function finishOpening(requestId:string,success:boolean){if(openingRef.current?.requestId!==requestId)return;openingRef.current=null;setOpening(null);if(!success)setError("Edit could not be opened. Retry.");}
 useEffect(()=>{let live=true;let off:(()=>void)|undefined;const listener=listenEditorOpenResult(result=>{if(live)finishOpening(result.requestId,result.success);});openListener.current=listener;void listener.then(fn=>{if(live)off=fn;else fn();}).catch(()=>{});return()=>{live=false;off?.();};},[]);
 useEffect(()=>{if(!opening)return;const timer=setTimeout(()=>{if(openingRef.current?.requestId===opening.requestId){finishOpening(opening.requestId,true);setError("Edit is taking too long. Retry opening the image.");}},30000);return()=>clearTimeout(timer);},[opening]);
 const [recordingError,setRecordingError]=useState("");

 const [videos,setVideos]=useState<readonly VideoClip[]>([]);
 const [previewResult,setPreviewResult]=useState<PreviewResult|null>(null);
 const [initialReads,setInitialReads]=useState({local:true,ftp:true,video:true});
 const listing=tab==="ftp"?initialReads.ftp:initialReads.local&&initialReads.video;
 const [sourceErrors,setSourceErrors]=useState({local:"",ftp:"",video:""});
 const collectionError=tab==="ftp"?sourceErrors.ftp:[sourceErrors.local,sourceErrors.video].filter(Boolean).join(" ");
 const listError=!!collectionError;
 useEffect(()=>{
  let live=true,receivedEvent=false;
  let off:(()=>void)|undefined;
  const receive=(status:Awaited<ReturnType<typeof readRecordingStatus>>)=>{
   if(!live)return;
   if(status.phase==="failed"){
    selectTab("local",true);
    setRecordingError(status.error==="unsupported_recording"?"Recording requires macOS 15 or later.":"Recording could not finish. Check Local for a recovered video.");
   } else if(status.phase==="starting"||status.phase==="ready")setRecordingError("");
  };
  void listenRecording(status=>{receivedEvent=true;receive(status);}).then(dispose=>{
   if(!live){dispose();return;}
   off=dispose;
   return readRecordingStatus().then(status=>{if(!receivedEvent)receive(status);});
  }).catch(()=>{});
  return()=>{live=false;off?.();};
 },[]);

 const previewCache=useMemo(()=>createPreviewCache(),[]);
 useEffect(()=>()=>previewCache.clear(),[previewCache]);
 useEffect(()=>{previewCache.retain(new Set(ftp.filter(item=>item.status==="success").map(previewKey)));},[ftp,previewCache]);
 const forceVideoPreview=useRef<{key:string;revision:number}|null>(null);
 const [previewRevision,setPreviewRevision]=useState(0);
 const [pendingDelete,setPendingDelete]=useState<Row[]>([]);
 const [selection,setSelection]=useState<Set<string>>(new Set());const anchor=useRef<string|null>(null);
 const autoPick=useRef(true);
 const alive=useRef(false),actionPending=useRef(false);
 const readers=useMemo(()=>{
  function sourceReader<T>(source:LibrarySource,label:string,read:()=>Promise<readonly T[]>,publish:(rows:readonly T[])=>void){
   return coalesceRefresh(async()=>{
    try {
     const rows=await read();
     if(!Array.isArray(rows))throw new Error("Invalid library metadata.");
     if(alive.current){publish(rows);setSourceErrors(previous=>previous[source]?{...previous,[source]:""}:previous);}
    } catch(error) {
     const message=error instanceof Error?error.message:`${label} history could not be loaded. Retry Library.`;
     if(alive.current)setSourceErrors(previous=>previous[source]===message?previous:{...previous,[source]:message});
    } finally {
     if(alive.current)setInitialReads(previous=>previous[source]?{...previous,[source]:false}:previous);
    }
   });
  }
  return {
   local:sourceReader("local","Local",listLocalCache,setLocal),
   video:sourceReader("video","Video",listRecordings,setVideos),
   ftp:sourceReader("ftp","FTP",listFtpQueue,setFtp),
  };
 },[]);
 async function refresh(source?:LibrarySource){
  if(source)await readers[source]();
  else await Promise.all([readers.local(),readers.video(),readers.ftp()]);
 }
 useEffect(()=>{
  alive.current=true;
  document.title="FerShot X — Library";
  let live=true;
  const disposers:Array<()=>void>=[];
  const subscribe=(event:string,handler:(payload:unknown)=>void,initialRead:()=>void)=>{
   void listenLibrary(event,payload=>{if(live)handler(payload);})
    .then(off=>{if(live)disposers.push(off);else off();})
    .catch(()=>{})
    .then(()=>{if(live)initialRead();});
  };
  const readLocal=()=>{void refresh("local");void refresh("video");};
  const readFtp=()=>{void refresh("ftp");};
  subscribe("fershot-library-updated",source=>{
   if(source==="local"||source==="video")void refresh(source);
   else readLocal();
  },readLocal);
  subscribe("fershot-ftp-updated",readFtp,readFtp);
  const onVisible=()=>{if(live&&!document.hidden)void refresh();};
  document.addEventListener("visibilitychange",onVisible);
  const timer=setInterval(onVisible,60000);
  return()=>{
   alive.current=false;live=false;
   disposers.forEach(off=>off());
   document.removeEventListener("visibilitychange",onVisible);
   clearInterval(timer);
  };
 },[]);
 const uploaded=useMemo(()=>new Set(ftp.filter(item=>item.status==="success").map(item=>item.sourceId)),[ftp]);
 const visibleLocal=useMemo(()=>local.filter(entry=>!uploaded.has(entry.id)),[local,uploaded]);
 const rows=useMemo<Row[]>(()=>{const list:Row[]=tab==="local"?[...visibleLocal.map(e=>({kind:"local" as const,id:e.id,revision:String(e.revision??0),name:e.name,time:e.createdAt,size:e.byteSize,width:e.width,height:e.height})),...videos.filter(clip=>!uploaded.has(clip.id)).map(clip=>({kind:"local" as const,id:clip.id,revision:clip.revision??clip.id,name:clip.name,time:clip.createdAt,size:clip.byteSize,width:clip.width,height:clip.height,video:clip,isVideo:true}))]:ftp.map(e=>({kind:"ftp",id:e.id,name:e.name,time:e.createdAt,upload:e,isVideo:e.remotePath.endsWith(".mp4")}));return list.sort((a,b)=>b.time-a.time);},[tab,visibleLocal,ftp,videos,uploaded]);
 const dates=useMemo(()=>new Map(rows.map(row=>{const date=new Date(row.time);return [row.time,{iso:date.toISOString(),display:dateFormatter.format(date)}];})),[rows]);
 const current=rows.find(row=>key(row)===selected);
 const rowIds=rows.map(key).join("|");
 useEffect(()=>{if(busy||current||(!autoPick.current&&selected===null))return;const retained=rows.filter(row=>selection.has(key(row)));const first=retained[0]??rows[0];if(!first)return;autoPick.current=false;anchor.current=key(first);setSelected(key(first));setSelection(retained.length?new Set(retained.map(key)):new Set([key(first)]));},[tab,rowIds,selected,busy]);
 const cachedPreviewKey=current?.upload?.status==="success"?previewKey(current.upload):null;
 const requestedPreview=current?JSON.stringify([selected,current.revision,cachedPreviewKey,previewRevision]):null;
 const displayedPreview=previewResult?.key===requestedPreview?previewResult:null;
 const loading=!!requestedPreview&&!displayedPreview;
 const preview=displayedPreview&&"image" in displayedPreview?displayedPreview.image:null;
 const videoPreview=displayedPreview&&"clip" in displayedPreview?displayedPreview.clip:null;
 const videoPreviewDocument=displayedPreview&&"clip" in displayedPreview?displayedPreview.document:null;
 const previewError=displayedPreview&&"error" in displayedPreview?displayedPreview.error:"";
 useEffect(()=>{
  setPreviewResult(null);
  if(!current||!requestedPreview)return;
  const row=current,request=requestedPreview;
  let live=true,owned="",leased=false;
  const forced=forceVideoPreview.current;
  const force=forced?.key===key(row)&&forced.revision===previewRevision;
  if(force)forceVideoPreview.current=null;
  const release=()=>{
   if(owned){URL.revokeObjectURL(owned);owned="";}
   if(leased){leased=false;void releaseRecordingPreview(row.id).catch(()=>{});}
  };
  async function loadPreview(){
   try{
    let result:PreviewResult;
    if(row.isVideo){
     const document=row.video?await readRecording(row.id):null;
     leased=!!document;
     const clip=document?.clip??await readFtpVideo(row.id,force);
     result={key:request,clip,document};
    } else {
     const read=()=>readLibraryImage(row.kind,row.id);
     const image=cachedPreviewKey?await previewCache.load(cachedPreviewKey,read):await read();
     owned=image.src;
     result={key:request,image};
    }
    if(live)setPreviewResult(result);
    else release();
   } catch(error) {
    release();
    if(live)setPreviewResult({key:request,error:error instanceof Error?error.message:"Preview unavailable."});
   }
  }
  void loadPreview();
  return()=>{live=false;release();};
 },[requestedPreview,previewCache]);
 function retryPreview(){
  if(!current)return;
  if(current.isVideo&&current.kind==="ftp")forceVideoPreview.current={key:key(current),revision:previewRevision+1};
  if(cachedPreviewKey)previewCache.invalidate(cachedPreviewKey);
  setPreviewRevision(n=>n+1);
 }
 function refreshPreviews(){retryPreview();void refresh();}

 async function run(operation:()=>Promise<unknown>,update?:LibrarySource){if(actionPending.current||openingRef.current)return;actionPending.current=true;setBusy(true);setError("");try{await operation();if(update)await refresh(update);}catch(e){if(alive.current)setError(e instanceof Error?e.message:"Library action failed.");}finally{actionPending.current=false;if(alive.current)setBusy(false);}}
 async function openEdit(row:Row){const request={key:key(row),requestId:crypto.randomUUID()};openingRef.current=request;setOpening(request);try{await openListener.current;if(row.video)await openRecording(row.id,request.requestId);else if(row.isVideo)await editFtpVideo(row.id,request.requestId);else await editLibraryImage(row.kind,row.id,request.requestId);}catch(error){finishOpening(request.requestId,true);throw error;}}
 const selectedRows=rows.filter(row=>selection.has(key(row)));
 const selectionBusy=selectedRows.some(row=>row.upload?.status==="uploading");
 function choose(row:Row,extend=false,toggle=false){if(busy)return;const id=key(row);let next=new Set<string>();if(extend&&anchor.current&&rows.some(r=>key(r)===anchor.current)){const a=rows.findIndex(r=>key(r)===anchor.current),b=rows.indexOf(row);next=new Set(rows.slice(Math.min(a,b),Math.max(a,b)+1).map(key));}else if(toggle){next=new Set(selection);if(next.has(id))next.delete(id);else next.add(id);anchor.current=id;}else{next.add(id);anchor.current=id;}setSelection(next);setSelected(next.has(id)?id:rows.find(r=>next.has(key(r)))?key(rows.find(r=>next.has(key(r)))!):null);}
 async function copySelection(){if(!selectedRows.length)return;if(tab==="ftp")await copyUploadUrl([...selectedRows].sort((a,b)=>a.time-b.time).map(row=>row.upload!.url).join("\n"));else if(selectedRows.some(row=>row.isVideo)){if(selectedRows.length!==1)throw new Error("Copy videos individually. Multiple images can be copied together.");await invoke("recording_copy_library",{id:selectedRows[0].id});}else await copyLibraryImages([...selectedRows].sort((a,b)=>a.time-b.time).map(row=>row.id));}
 async function removeSelection(remote=false){
  const targets=remote?pendingDelete:selectedRows;
  const sources=new Set<LibrarySource>();
  try{
   for(const row of targets){
    sources.add(row.video?"video":row.kind);
    if(remote)await deleteFtpRemote(row.id);
    else if(row.video)await removeRecording(row.id);
    else if(row.kind==="local")await removeLocalCache(row.id);
    else await removeFtpUpload(row.id);
    const id=key(row);
    setSelection(old=>{const next=new Set(old);next.delete(id);return next;});
    if(selected===id)autoPick.current=true;
    setSelected(old=>old===id?null:old);
   }
  }finally{
   setPendingDelete([]);
   await Promise.all([...sources].map(source=>refresh(source)));
  }
 }
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
 function selectTab(value:string,fromRecording=false){if((busy&&!fromRecording)||value===activeTab.current)return;activeTab.current=value as LibraryKind;autoPick.current=true;setTab(activeTab.current);setSelected(null);setSelection(new Set());anchor.current=null;setError("");}
 const issue=error||previewError||recordingError||collectionError;
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
   <header>
    <div>
     <h2>{current?.name??(rows.length?"Select an image":tab==="ftp"?"FTP uploads":"Local images")}</h2>
     <span className="library-image-metrics" aria-label="Image dimensions and file size">{videoPreview?`${videoPreview.width} × ${videoPreview.height} · ${formatTime(videoPreview.durationMs)} · ${bytes(videoPreview.byteSize)}`:preview?`${preview.width} × ${preview.height} · ${bytes(preview.byteSize)}`:current?.width&&current?.height?`${current.width} × ${current.height} · ${bytes(current.size??0)}`:"\u00a0"}</span>
    </div>
    <div className="library-preview-actions" role="group" aria-label="Preview actions">
     {current&&<ToolHint label="Edit Image"><Button icon={opening?LoaderCircle:Pencil} className={opening?"library-edit-opening":undefined} variant="outline" size="icon" aria-label="Edit image" aria-busy={!!opening} disabled={busy} onClick={()=>void run(()=>openEdit(current))}/></ToolHint>}
     <ToolHint label={!liveTextAvailable?"Live Text requires macOS 13 or later":liveTextState==="empty"?"No Text Found":"Live Text"}>
      <Toggle variant="outline" size="sm" className={liveTextState==="analyzing"?"library-live-text library-edit-opening":"library-live-text"} aria-label="Live Text" aria-busy={liveTextState==="analyzing"} pressed={liveText} disabled={!liveTextAvailable||!preview||busy} onPressedChange={enabled=>{setError("");setLiveText(enabled);setLiveTextState(enabled?"analyzing":"idle");}}>
       {liveTextState==="analyzing"?<LoaderCircle size={16}/>:<ScanText size={16}/>}
       <span className="sr-only">{liveTextState==="empty"?"No text found":liveTextState==="analyzing"?"Analyzing image":liveTextState==="ready"?"Select text in the image":"Select text using macOS Live Text"}</span>
      </Toggle>
     </ToolHint>
     <ToolHint label="Refresh Library"><Button icon={RefreshCw} variant="outline" size="icon" aria-label="Refresh library" disabled={busy||listing} onClick={refreshPreviews}/></ToolHint>
    </div>
   </header>
   {issue&&<div className="library-error">
    <StatusMessage tone="error">{issue}</StatusMessage>
    {issue===previewError&&current&&<Button icon={RefreshCw} variant="outline" size="sm" onClick={retryPreview}>Retry preview</Button>}
    {issue===previewError&&current?.kind==="ftp"&&<Button icon={Settings2} variant="outline" size="sm" onClick={()=>void run(()=>openPreferencesWindow("uploading"))}>Open Settings</Button>}
   </div>}
   <div className="library-preview">{opening&&<div className="library-opening-overlay"><LoadingState>Opening image in Edit</LoadingState></div>}{listing?<LoadingState>Loading library…</LoadingState>:loading?<LoadingState>Loading preview…</LoadingState>:videoPreview?<VideoPreview key={`${videoPreview.id}:${previewRevision}:${current?.revision??""}`} clip={videoPreview} document={videoPreviewDocument}/>:preview?<LibraryImagePreview key={selected??preview.id} image={preview} name={current?.name??"Selected image"} liveText={liveText} onLiveTextState={setLiveTextState} onLiveTextError={message=>{setLiveText(false);setLiveTextState("idle");setError(message);}}/>:current?<EmptyState icon={ImageOff} title="This preview is unavailable."/>:rows.length?<EmptyState icon={Images} title="Select an image."/>:listError?<EmptyState icon={ImageOff} title="Refresh to load your library." action={<Button icon={RefreshCw} onClick={()=>void refresh()}>Retry Library</Button>}/>:<EmptyState icon={tab==="ftp"?CloudUpload:Images} title={tab==="ftp"?"No FTP uploads yet.":"Capture an image from the menu bar."} action={<Button icon={tab==="ftp"?Settings2:Keyboard} onClick={()=>void run(()=>openPreferencesWindow(tab==="ftp"?"uploading":"hotkeys"))}>{tab==="ftp"?"Set Up FTP":"Set Up Shortcuts"}</Button>}/>}</div>
   {current&&<footer className="library-metadata"><div>{current.upload?<><strong className="status-badge" data-tone={uploadTone(current.upload.status)}>{current.upload.status}</strong><output title={current.upload.remotePath}>{current.upload.remotePath}</output>{current.upload.error&&<p role="alert" title={current.upload.error}>{current.upload.error}</p>}</>:<span>Captured {dateFormatter.format(new Date(current.time))} · Local cache</span>}</div>{current.upload&&["failed","pending"].includes(current.upload.status)&&<div className="library-detail-actions" role="group" aria-label="Image actions"><Button icon={RotateCw} variant="outline" size="sm" disabled={busy} onClick={()=>void run(()=>startFtpUpload(current.id),"ftp")}>Retry upload</Button></div>}</footer>}
  </section>
 <AlertDialog open={pendingDelete.length>0} onOpenChange={open=>{if(!open)setPendingDelete([]);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete image from FTP?</AlertDialogTitle><AlertDialogDescription>Permanently delete {pendingDelete.length===1?pendingDelete[0]?.upload?.remotePath:`${pendingDelete.length} images`} from FTP?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction data-variant="destructive" onClick={()=>{void run(()=>removeSelection(true));}}>Delete permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </main>;
}
