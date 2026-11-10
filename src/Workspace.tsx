import { readCaptureUploadMode } from "./platform/native";
import { EditorAddImage } from "./components/EditorAddImage";
import { createPointerColor } from "./components/pointer-color";
import { EditorToolbarProvider,EditorToolStrip,EditorTool } from "./components/EditorToolbarLayout";
import { EditorImageStatus } from "./components/EditorImageStatus";
import { WindowTitleBar } from "./components/WindowTitleBar";
import { mapItem } from "./features/editor/konva/model";
import {captureScrollImage} from "./platform/native";
import {Copy,Save,CloudUpload,Undo2,X} from "lucide-react";
import { fitEditorWindow } from "./platform/library";
import { takeEditorImage,showEditor,listenLibrary } from "./platform/library";
import { Button } from "./components/ui/button";
import { FtpFailurePanel } from "./features/ftp-failure/FtpFailurePanel";
import { useLocalHistory } from "./Workspace.local-cache";
import { recordDiagnostic } from "./platform/diagnostics";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "./contracts/settings";
import { listenPreferencesChanged } from "./platform/preferences-window";
import { DEFAULT_APP_PREFERENCES, type FerShotAppPreferences } from "./features/app-preferences";
import { readApplicationPreferences, setWorkspaceOnTop, setMenuBarIcon, supportsNativeOutput, copyText } from "./platform/native";
import { readLoginState, notifyCaptureCompleted } from "./platform/native";
import type { Annotation } from "./contracts/editor";
import { withWorkspaceAnnotations } from "./platform/annotations";
import type { AdvancedEditorItem } from "./features/editor/advanced-workbench";
import { WorkspaceEditor } from "./Workspace.editor";
import type { CaptureMode, ImageDocument } from "./contracts/media";
import { importImage } from "./platform/import-image";
import { captureImageWithScale, copyImage, importClipboardImage, NativeOperationError,  readAppInfo, rasterizeDocument, saveImage, transformImage, readRepeatAreaAvailable, captureRepeatArea, type ProcessOptions } from "./platform/native";
import { WorkspaceDirectTools } from "./Workspace.direct-tools";
import { useWorkspaceFtp } from "./Workspace.ftp";
import { enqueueFtpUpload, startFtpUpload, copyUploadUrl } from "./platform/ftp";
import { withOutputPreferences } from "./platform/output-preferences";
import { captureActiveWindow } from "./platform/native";
import { hideWorkspace } from "./platform/native";
import { WorkspaceDocumentOpen } from "./Workspace.document-open";
import { openRequestedDocument } from "./platform/native";
import { listenGlobalActions, listenWorkspaceMenu } from "./platform/native";
import { openImageDialog } from "./platform/native";
import type { PixelEffectRequest } from "./features/effects-panel";
import { applyImageEffect } from "./platform/native";

import "./Workspace.css";

const EMPTY_ADVANCED_ITEMS: readonly AdvancedEditorItem[] = Object.freeze([]);
const EMPTY_ANNOTATIONS: readonly Annotation[] = Object.freeze([]);

export default function Workspace() {
  const automaticUploads=useRef(new Map<string,ImageDocument>());
  const capturedPreviewIds = useRef(new Set<string>());
  const [images, setImages] = useState<ImageDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [, setRuntimeLabel] = useState("Local workspace");
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...DEFAULT_SETTINGS }));
  const [applicationPreferences, setApplicationPreferences] = useState<Readonly<FerShotAppPreferences>>(DEFAULT_APP_PREFERENCES);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferenceNotice, setPreferenceNotice] = useState("");
  const [notice, setNotice] = useState("");

  const [editing, setEditing] = useState(true);
  const ftpQueue = useWorkspaceFtp();
  const localHistory = useLocalHistory();
  const [lastUploadId, setLastUploadId] = useState<string | null>(null);
  const lastUpload = ftpQueue.items.find(item => item.id === lastUploadId);
  const scrollActive=false;
  const sessionRevision = useRef(0);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [transformMode, setTransformMode] = useState<"crop" | "resize" | null>(null);
  const globalAction = useRef<(action: unknown, fromMenu?: boolean) => void>(() => {});
  const [, setCapturePreviewId] = useState<string | null>(null);
  const [hasRepeatArea, setHasRepeatArea] = useState(false);
  const sourceRevisions = useRef(new Map<string, number>());
  const captureScales = useRef(new Map<string, number>());
  const originalById = useRef(new Map<string, string>());
  const [annotationsById, setAnnotationsById] = useState<ReadonlyMap<string, readonly Annotation[]>>(() => new Map());
  const [advancedById, setAdvancedById] = useState<ReadonlyMap<string, readonly AdvancedEditorItem[]>>(() => new Map());
  const [pointerColor]=useState(createPointerColor);
  const [displayZoom,setDisplayZoom]=useState(1);
  const fitZoom=useRef(1);
  const [imageToInsert,setImageToInsert]=useState<{id:string;src:string;width:number;height:number;target:string}|undefined>();
  const viewportHost=useRef<HTMLDivElement>(null);
  const [viewportWidth,setViewportWidth]=useState<number>();
  useLayoutEffect(()=>{const node=viewportHost.current;if(!node)return;const measure=()=>{const w=node.clientWidth-24,h=node.clientHeight-24;if(w>20&&h>20)setViewportWidth(Math.max(100,Math.min(w,h*16/9)));};const observer=new ResizeObserver(measure);observer.observe(node);measure();return()=>observer.disconnect();},[]);
  const picker = useRef<HTMLInputElement>(null);
  const liveImages = useRef<ImageDocument[]>([]);
  const busyRef = useRef(false);
  const preferenceRefreshPending = useRef(false);
  const reloadPreferences = useRef<() => void>(() => {});
  const mounted = useRef(true);
  const hadImage=useRef(false);
  useEffect(()=>{if(images.length)hadImage.current=true;else if(hadImage.current){hadImage.current=false;void hideWorkspace();}},[images.length]);
  const image = images.find((item) => item.id === selectedId);
  const annotations = image ? annotationsById.get(image.id) ?? EMPTY_ANNOTATIONS : EMPTY_ANNOTATIONS;
  const advancedItems = image ? advancedById.get(image.id) ?? EMPTY_ADVANCED_ITEMS : EMPTY_ADVANCED_ITEMS;
  useEffect(()=>{if(!image)return;const timer=window.setTimeout(()=>{void localHistory.remember(image,{schemaVersion:1,width:image.width,height:image.height,annotations,advanced:advancedItems});},300);return()=>window.clearTimeout(timer);},[image,annotations,advancedItems,localHistory.remember]);
  const originalId = image ? originalById.current.get(image.id) : undefined;
  const originalImage = originalId ? images.find(item => item.id === originalId) : undefined;
  const withEdits = <T,>(source: ImageDocument, basic: readonly Annotation[], use: (document: ImageDocument) => Promise<T>) => withWorkspaceAnnotations(source, basic, advancedById.get(source.id) ?? EMPTY_ADVANCED_ITEMS, use);


  useEffect(() => { setTransformMode(null); setLastUploadId(null); setNotice(value=>value.startsWith("Upload queued")?"":value); }, [image?.id]);
  useEffect(()=>{if(lastUpload?.status==="success")setNotice(value=>value.startsWith("Upload queued")?"":value);},[lastUpload?.status]);

  useEffect(() => {
    for (const item of ftpQueue.items) if (item.status === "success") void localHistory.forget(item.sourceId);
  }, [ftpQueue.items, localHistory.forget]);

  function addDocument(next: ImageDocument, select = true) {
    if (!mounted.current) { captureScales.current.delete(next.id); URL.revokeObjectURL(next.src); return; }
    if (liveImages.current.length >= 512) { captureScales.current.delete(next.id); URL.revokeObjectURL(next.src); throw new RangeError("Session library is limited to 512 images."); }
    sessionRevision.current++;
    void fitEditorWindow(next.width,next.height).then(()=>showEditor()).catch(()=>setError("Edit could not be brought forward. Open an image again from Library."));
    setEditing(true);
    liveImages.current = [...liveImages.current, next];
    setImages([...liveImages.current]);
    localHistory.activate(next);
    if(next.draft){setAnnotationsById(previous=>new Map(previous).set(next.id,next.draft!.annotations));setAdvancedById(previous=>new Map(previous).set(next.id,next.draft!.advanced));}
    void localHistory.remember(next);
    if (select) { setSelectedId(next.id); setZoom(null); }
  }

  useEffect(()=>{for(const [id,captured]of automaticUploads.current){const job=ftpQueue.items.find(item=>item.id===id);if(job?.status==="success"){automaticUploads.current.delete(id);capturedPreviewIds.current.delete(captured.id);captureScales.current.delete(captured.id);URL.revokeObjectURL(captured.src);}else if(job?.status==="failed"){automaticUploads.current.delete(id);addDocument(captured,true);setError("Automatic FTP upload failed. Your image is open in Edit; retry the queued upload from Library.");}}},[ftpQueue.items]);

  function addDerivedDocument(next: ImageDocument, parentId: string, preserveScale = true) {
    const originalId = originalById.current.get(parentId) ?? parentId;
    const scale = captureScales.current.get(parentId);
    if (preserveScale && scale !== undefined) captureScales.current.set(next.id, scale);
    if (capturedPreviewIds.current.has(parentId)) capturedPreviewIds.current.add(next.id);
    next={...next,localId:liveImages.current.find(item=>item.id===parentId)?.localId??parentId};
    addDocument(next);
    if (liveImages.current.some(document => document.id === next.id)) originalById.current.set(next.id, originalId);
  }

  function restoreOriginal() {
    if (busyRef.current || scrollActive || !image) return;
    const id = originalById.current.get(image.id);
    if (!id || !liveImages.current.some(document => document.id === id)) {
      setNotice("The source image is no longer retained in this session."); return;
    }
    setSelectedId(id); setZoom(null); const original=liveImages.current.find(source=>source.id===id);if(original){localHistory.activate(original);void fitEditorWindow(original.width,original.height);}
    setNotice("Returned to the retained source; the derived image and all edit histories remain in the library.");
  }

  useEffect(() => {
    const unexpected = (event:Event) => recordDiagnostic("app", "unhandled", "other",{operation:event.type==="error"?"renderer_error":"unhandled_rejection"});
    window.addEventListener("error", unexpected); window.addEventListener("unhandledrejection", unexpected);
    return () => { window.removeEventListener("error", unexpected); window.removeEventListener("unhandledrejection", unexpected); };
  }, []);

  async function operate(operation: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError(""); setNotice("");
    try { await operation(); }
    catch (reason) {
      if (!(reason instanceof NativeOperationError)) recordDiagnostic("image", "failed", "other");
      if (reason instanceof NativeOperationError && reason.code === "cancelled") setNotice("Capture cancelled.");
      else setError(reason instanceof Error ? reason.message : "The image operation failed.");
    } finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  }

  function openClipboard() {
    void operate(async () => { addDocument(await importClipboardImage()); setNotice("Clipboard image opened."); });
  }

  async function finishCapture(capture: { image: ImageDocument; displayScale: number | null },instant=false) {
    const captured = capture.image;
    capturedPreviewIds.current.add(captured.id);
    if (capture.displayScale !== null) captureScales.current.set(captured.id, capture.displayScale);
    if(instant){
      let queued:string|undefined;
      try{
        localHistory.activate(captured);await localHistory.remember(captured);
        const item=await withOutputPreferences(captured,settings,capture.displayScale,output=>enqueueFtpUpload(captured.localId??captured.id,output));queued=item.id;
        automaticUploads.current.set(item.id,captured);
        try{await copyUploadUrl(item.url);}catch{recordDiagnostic("clipboard","failed","clipboard_failed",{operation:"copy_text"});}
        await startFtpUpload(item.id);await ftpQueue.refresh();
      }catch(error){if(queued)automaticUploads.current.delete(queued);addDocument(captured,true);throw error;}
      return;
    }
    addDocument(captured, true);
    if (!mounted.current) return;
    setCapturePreviewId(null); setEditing(true);  
    setNotice("Capture ready to edit. Press ⌘S to upload.");
    await notifyCapture("opened");
  }

  async function notifyCapture(action: "opened" | "copied" | "saved") {
    if (!mounted.current || !applicationPreferences.showSystemNotifications || !supportsNativeOutput()) return;
    try { await notifyCaptureCompleted(action); }
    catch { if (mounted.current) setPreferenceNotice("Capture completed; its notification could not be submitted."); }
  }
  async function captureUploadMode(){try{return await readCaptureUploadMode();}catch(error){await showEditor();throw error;}}
  function capture(mode: CaptureMode) {
    void operate(async () => {
      setCapturing(true);
      try {
        const instant=await captureUploadMode();await finishCapture(await captureImageWithScale(mode,instant),instant);
        if (mode === "area") {
          const available = await readRepeatAreaAvailable().catch(() => false);
          if (mounted.current) { setHasRepeatArea(available); if(!instant)setNotice(available ? "Area opened in editor. Repeat Region uses this selection." : "Area opened in editor. macOS did not provide repeat coordinates; select again to update Repeat Region."); }
        }
      } finally {
        if (mounted.current) setCapturing(false);
      }
    });
  }

  globalAction.current = (action, fromMenu = false) => {
    if(action==="capture-upload-setting-failed"){setError("Automatic upload mode could not be saved. Please retry from the tray menu.");return;}
    if (action === "startup-failed") { setError("Launch at Startup could not be changed. Check Settings and retry."); return; }
    const focused = document.activeElement;
    if (busyRef.current || document.querySelector('[aria-modal="true"]') || scrollActive || (!fromMenu && document.hasFocus() && focused instanceof HTMLElement && (focused.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(focused.tagName)))) return;
    if (action === "capture-fullscreen") capture("fullscreen");
    else if (action === "capture-area") capture("area");
    else if (action === "capture-window") capture("window");
    else if (action === "capture-active-window") captureActive();
    else if (action === "capture-repeat-region") repeatArea();
    else if (action === "capture-scrolling") scrollCapture();
    else if (action === "show-workspace") { window.focus(); setNotice("Workspace focused."); }

    else if (fromMenu && action === "open-file") { void operate(async () => { const opened = await openImageDialog(); if (opened) addDocument(opened); }); }
    else if (fromMenu && action === "open-clipboard") openClipboard();
    else if (fromMenu && action === "image-copy") copy();
    else if (fromMenu && action === "image-save") save();
    else if (fromMenu && action === "image-upload") upload();
  };

  function scrollCapture(){void operate(async()=>{try{const instant=await captureUploadMode();await finishCapture({image:await captureScrollImage(instant),displayScale:null},instant);}catch(error){if(!(error instanceof NativeOperationError&&error.code==="cancelled"))await showEditor();throw error;}});}

  function repeatArea() {
    if (busyRef.current || scrollActive || !hasRepeatArea) return;
    void operate(async () => {
      setCapturing(true);
      try { const instant=await captureUploadMode();await finishCapture(await captureRepeatArea(instant),instant); }
      catch (reason) { if (reason instanceof NativeOperationError && ["display_changed", "repeat_unavailable"].includes(reason.code)) setHasRepeatArea(false); void readRepeatAreaAvailable().catch(() => {}); throw reason; }
      finally { if (mounted.current) setCapturing(false); }
    });
  }

  function captureActive() {
    void operate(async () => {
      setCapturing(true);
      try { const instant=await captureUploadMode();await finishCapture(await captureActiveWindow(instant),instant); }
      finally { if (mounted.current) setCapturing(false); }
    });
  }


  useEffect(() => {
    let active = true; let unlisten: (() => void) | undefined;
    void listenGlobalActions(action => { if (active) globalAction.current(action); }).then(dispose => {
      if (active) unlisten = dispose; else dispose();
    }).catch(() => { if (active) setNotice("Global shortcut events are unavailable in this window."); });
    return () => { active = false; unlisten?.(); };
  }, []);

  useEffect(() => {
    let active = true; let unlisten: (() => void) | undefined;
    void listenWorkspaceMenu(action => { if (active) globalAction.current(action, true); }).then(dispose => {
      if (active) unlisten = dispose; else dispose();
    }).catch(() => { if (active) setNotice("Native menu events are unavailable in this window."); });
    return () => { active = false; unlisten?.(); };
  }, []);

  useEffect(() => { if (!settings.showPreview) setCapturePreviewId(null); }, [settings.showPreview]);

  function transform(options: ProcessOptions) {
    if (!image) return;
    void operate(async () => {const next=await transformImage(image,options);const crop=options.crop??{x:0,y:0,width:image.width,height:image.height};const sx=next.width/crop.width,sy=next.height/crop.height;const map=(p:{x:number;y:number})=>({x:Math.max(0,Math.min(next.width,(p.x-crop.x)*sx)),y:Math.max(0,Math.min(next.height,(p.y-crop.y)*sy))});const all=[...annotations.map(a=>({id:a.id,itemKind:"contract" as const,annotation:a})),...advancedItems].map(item=>mapItem(item,map,Math.sqrt(sx*sy)));next.draft={schemaVersion:1,width:next.width,height:next.height,annotations:[],advanced:all};addDerivedDocument(next,image.id,!!options.crop);setNotice("Draft updated; editable elements preserved.");});
  }

  function updateAdvanced(id: string, items: readonly AdvancedEditorItem[]) {
    if (!liveImages.current.some(document => document.id === id)) return;
    const current=liveImages.current.find(document=>document.id===id);if(current)localHistory.activate(current);
    sessionRevision.current++;
    sourceRevisions.current.set(id, (sourceRevisions.current.get(id) ?? 0) + 1);
    setAdvancedById(previous => new Map(previous).set(id, items));
  }

  function applyEffect(effect: PixelEffectRequest) {
    if (!image) return;
    void operate(async () => {
      const next=await applyImageEffect(image,effect);next.draft={schemaVersion:1,width:next.width,height:next.height,annotations,advanced:advancedItems};addDerivedDocument(next,image.id);
      setNotice("Effect image created; original and edit history preserved.");
    });
  }

  const incomingPending = useRef(true);
  const [incomingRevision,setIncomingRevision] = useState(0);
  useEffect(()=>{let live=true;let off:(()=>void)|undefined;void listenLibrary("fershot-editor-image",()=>{incomingPending.current=true;setIncomingRevision(n=>n+1);}).then(fn=>{if(live)off=fn;else fn();});return()=>{live=false;off?.();};},[]);
  useEffect(()=>{if(busy||!preferencesReady||!incomingPending.current)return;incomingPending.current=false;void operate(async()=>{for(let count=0;count<4;count++){const incoming=await takeEditorImage();if(!incoming)break;capturedPreviewIds.current.add(incoming.id);addDocument(incoming);setNotice("Library image ready to edit. Original preserved.");}});},[busy,preferencesReady,incomingRevision]);

  async function hideCompletedCapture(id: string) {
    if (capturedPreviewIds.current.has(id)) await hideWorkspace();
  }

  function copy() {
    if (!image) return;
    void operate(async () => { await withEdits(image, annotations, async rendered => {
      await withOutputPreferences(rendered, settings, captureScales.current.get(image.id), copyImage);
      await localHistory.remember(image,{schemaVersion:1,width:image.width,height:image.height,annotations,advanced:advancedItems});
    }); setNotice("Image copied to clipboard."); await hideWorkspace(); });
  }

  function save() {
    if (!image) return;
    void operate(async () => { const saved = await withEdits(image, annotations, async rendered => {
      const saved = await withOutputPreferences(rendered, settings, captureScales.current.get(image.id), output => saveImage(output, settings.saveFormat, settings.jpegQuality));
      if (saved) await localHistory.remember(image,{schemaVersion:1,width:image.width,height:image.height,annotations,advanced:advancedItems});
      return saved;
    }); setNotice(saved ? "Image saved." : "Save cancelled."); if (saved) await hideCompletedCapture(image.id); });
  }

  function upload() {
    if (!image || busyRef.current || scrollActive || document.querySelector('[aria-modal="true"]')) return;
    const sourceId = image.localId??image.id;
    void operate(async () => {
      const item = await withEdits(image, annotations, rendered => withOutputPreferences(rendered, settings, captureScales.current.get(sourceId), output => enqueueFtpUpload(sourceId, output)));
      if (mounted.current) setLastUploadId(item.id);
      await ftpQueue.refresh();
      // URL ownership is committed before any connection. A copy failure must not discard the upload.
      try { await copyUploadUrl(item.url); } catch { if (mounted.current) setError("The upload was queued, but its URL could not be copied. Copy it from Library."); }
      try { await startFtpUpload(item.id); await hideCompletedCapture(image.id); }
      finally { await ftpQueue.refresh(); }
    });
  }
  function insertImage(action:string){if(!image||busyRef.current)return;const target=image.id;void operate(async()=>{if(advancedItems.length+annotations.length>=1024)throw new Error("Remove an element before adding another image.");let added:ImageDocument|null=null;try{if(action==="open-file")added=await openImageDialog();else if(action==="capture-fullscreen"||action==="capture-area"||action==="capture-window"){const mode=action==="capture-fullscreen"?"fullscreen":action==="capture-area"?"area":"window";added=(await captureImageWithScale(mode)).image;if(mode==="area")setHasRepeatArea(await readRepeatAreaAvailable().catch(()=>false));}if(!added)return;const png=await rasterizeDocument(added);if(png.length>12*1024*1024)throw new Error("This image is too large to insert. Resize it first.");if(JSON.stringify(advancedItems).length+png.length>31*1024*1024)throw new Error("This draft has too many image layers. Remove a layer first.");setImageToInsert({id:crypto.randomUUID(),src:`data:image/png;base64,${png}`,width:added.width,height:added.height,target});}finally{if(added)URL.revokeObjectURL(added.src);await showEditor();}});}
  const outputActions=useRef({copy,save,canEscape:true});outputActions.current={copy,save,canEscape:!transformMode&&!effectsOpen};
  useEffect(()=>{const keydown=(event:KeyboardEvent)=>{const escape=event.key==="Escape";if(event.defaultPrevented||event.altKey||event.repeat||busyRef.current||document.querySelector('[aria-modal="true"],.editor-add-menu,.editor-size-popover,.editor-tool-overflow[open]'))return;if(!escape&&!(event.metaKey||event.ctrlKey))return;const target=event.target as HTMLElement|null;if(target?.closest("input,textarea,select,[contenteditable=true]"))return;const key=event.key.toLowerCase();if(escape){if(!outputActions.current.canEscape)return;event.preventDefault();outputActions.current.copy();}else if(key==="c"){event.preventDefault();outputActions.current.copy();}else if(key==="s"&&event.shiftKey){event.preventDefault();outputActions.current.save();}};document.addEventListener("keydown",keydown);return()=>document.removeEventListener("keydown",keydown);},[]);
  const uploadAction = useRef(upload); uploadAction.current = upload;
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s" || event.shiftKey || event.altKey || event.isComposing) return;
      event.preventDefault(); if (!event.repeat) uploadAction.current();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  useEffect(() => {
    let live = true; let dispose: (() => void) | undefined; let sequence = 0;
    const reload = () => {
      if (busyRef.current) { preferenceRefreshPending.current = true; return; }
      preferenceRefreshPending.current = false; const token = ++sequence;
      void readApplicationPreferences().then(async loaded => {
        let value = { ...loaded };
        try { const login = await readLoginState(); value = { ...value, launchAtLogin: login.enabled }; } catch { /* Other preferences remain usable. */ }
        if (live && token === sequence) { setApplicationPreferences(value); setSettings({ ...value.baseSettings }); setPreferenceNotice(""); }
      }).catch(() => { if (live) setPreferenceNotice("Updated preferences could not be loaded. Reopen Settings and retry."); });
    };
    reloadPreferences.current = reload;
    void listenPreferencesChanged(reload).then(off => { if (live) dispose = off; else off(); }).catch(() => {});
    return () => { live = false; dispose?.(); };
  }, []);
  useEffect(() => { if (!busy && preferenceRefreshPending.current) reloadPreferences.current(); }, [busy]);

  useEffect(() => {
    let active = true;
    void readApplicationPreferences().then(async loaded => {
      if (!active) return;
      setApplicationPreferences(loaded); setSettings({ ...loaded.baseSettings });
      if (supportsNativeOutput()) {
        try { await setWorkspaceOnTop(loaded.keepEditorAlwaysOnTop); }
        catch { if (active) setPreferenceNotice("Preferences loaded; window-on-top could not be applied."); }
        if (active) {
          try { await setMenuBarIcon(loaded.showInMenuBar); }
          catch { if (active) setPreferenceNotice("Preferences loaded; menu bar icon could not be applied."); }
        }
        if (active) {
          try {
            const login = await readLoginState();
            if (active) { setApplicationPreferences(previous => ({ ...previous, launchAtLogin: login.enabled })); }
          } catch { if (active) setPreferenceNotice("Preferences loaded; launch-at-login state is unavailable."); }
        }
      }
    })
      .catch(() => { if (active) setPreferenceNotice("Saved preferences could not be loaded. Defaults are active."); })
      .finally(() => { if (active) setPreferencesReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void readAppInfo().then((info) => {
      if (active && info) setRuntimeLabel(`v${info.version} · ${info.platform}`);
    }).catch(() => { if (active) setRuntimeLabel("Desktop connection unavailable"); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; liveImages.current.forEach((item) => URL.revokeObjectURL(item.src));automaticUploads.current.forEach(image=>URL.revokeObjectURL(image.src));automaticUploads.current.clear(); };
  }, []);

  useEffect(()=>{const keydown=(event:KeyboardEvent)=>{if(event.key!=="Tab"||event.shiftKey||event.metaKey||event.ctrlKey||event.altKey||!image||event.repeat)return;const target=event.target as HTMLElement|null;if(target?.closest("input,textarea,select,button,summary,[contenteditable=true],[aria-modal=true]"))return;event.preventDefault();void copyText(pointerColor.getSnapshot()).then(()=>setNotice(`Copied ${pointerColor.getSnapshot()}`)).catch(()=>setError("Color could not be copied."));};window.addEventListener("keydown",keydown);return()=>window.removeEventListener("keydown",keydown);},[image,pointerColor]);

  async function openFiles(files: File[]) {
    if (!files.length || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(""); setNotice("");
    try {
      for (const file of files) {
        if (!mounted.current) break;
        const next = await importImage(file);
        addDocument(next);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open this image.");
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
      if (picker.current) picker.current.value = "";
    }
  }


  const closeDocument=useRef(()=>{});closeDocument.current=()=>{if(image)void localHistory.remember(image,{schemaVersion:1,width:image.width,height:image.height,annotations,advanced:advancedItems});setSelectedId(null);};
  useEffect(()=>{let live=true;let off:(()=>void)|undefined;void listenLibrary("fershot-editor-closed",()=>closeDocument.current()).then(dispose=>{if(live)off=dispose;else dispose();});return()=>{live=false;off?.();};},[]);

  return (
    <EditorToolbarProvider><div className="workspace editor-window">
      <main className="main-panel" inert={false}>
        <WorkspaceDocumentOpen busy={busy || scrollActive || !preferencesReady} run={operate} onOpen={async id => {
          addDocument(await openRequestedDocument(id)); setNotice("Image opened from the desktop.");
        }} />

        <WindowTitleBar section="Edit"/>
        <header className="editor-chrome" aria-label="Editor tools">
          <div className="editor-unified-bar" role="toolbar" aria-label="All image tools">
            <EditorToolStrip>
             <EditorTool order={0} label="Add Image" hint={false}><EditorAddImage disabled={!image||busy||!preferencesReady} onAdd={insertImage}/></EditorTool>
             <EditorTool order={1} label="Copy Image" shortcut="Esc / ⌘C"><Button variant="ghost" size="icon" disabled={!image||busy} aria-label="Copy image" title="Copy Image" onClick={copy}><Copy/></Button></EditorTool>
             <EditorTool order={2} label="Save Image" shortcut="⌘⇧S"><Button variant="ghost" size="icon" disabled={!image||busy} aria-label="Save image…" title="Save Image" onClick={save}><Save/></Button></EditorTool>
             <EditorTool order={3} label="Upload" shortcut="⌘S"><Button variant="ghost" size="icon" disabled={!image||busy} aria-label="Upload ⌘S" title="Upload (⌘S)" onClick={upload}><CloudUpload/></Button></EditorTool>
             <div id="editor-annotation-tools"/>
             {originalId&&<EditorTool order={41} label="Return To Source Image"><Button variant="ghost" size="icon" disabled={busy||!originalImage} aria-label="Return to source image" title="Return To Source Image" onClick={restoreOriginal}><Undo2/></Button></EditorTool>}
            </EditorToolStrip>
            <EditorImageStatus image={image} colorSource={pointerColor} zoom={displayZoom} busy={busy} onFit={()=>setZoom(fitZoom.current)} onCrop={()=>{setTransformMode("crop");setEffectsOpen(false);}} onResize={(width,height)=>transform({resize:{width,height}})}/>
            <span className="document-title sr-only">{image?.name}</span>
          </div>
          <div id="editor-element-options"/><div id="editor-tool-options"/>
          {(transformMode||effectsOpen)&&<p className="editor-draft-hint">Enter to apply · Esc to cancel</p>}
          <p className="sr-only" role="status">{notice||preferenceNotice}</p>
        </header>
        {ftpQueue.error && <div className="error-banner" role="alert">{ftpQueue.error}<Button variant="ghost" size="sm" onClick={() => { void ftpQueue.refresh(); }}>Refresh FTP</Button></div>}
        {lastUpload && lastUpload.status !== "success" && <section className="ftp-upload-banner" aria-label="FTP upload status"><strong>{lastUpload.status === "failed" ? "Upload failed" : "Predicted URL"}</strong><output>{lastUpload.url}</output><span>File may not be available yet</span><Button variant="ghost" size="sm" disabled={busy} onClick={() => { void ftpQueue.copy(lastUpload.url); }}>Copy URL</Button></section>}
        {lastUpload?.status === "failed" && <FtpFailurePanel code={lastUpload.errorCode ?? null} message={lastUpload.error ?? ""} busy={busy || ftpQueue.pending}
          onRetry={() => { void ftpQueue.retry(lastUpload.id); }} />}
        {localHistory.error&&<div className="error-banner" role="alert">{localHistory.error}</div>}
        {error && <div className="error-banner" role="alert">{error}<Button variant="ghost" size="sm" onClick={() => setError("")} aria-label="Dismiss error"><X/></Button></div>}
        <div className="workspace-body" ref={viewportHost}>
        <section className={`stage ${dragging ? "dragging" : ""} ${image ? "has-image" : ""}`} aria-label="Image workspace" aria-busy={busy} style={{width:viewportWidth,aspectRatio:"16 / 9"}}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); void openFiles(Array.from(event.dataTransfer.files)); }}>
          {image&&<div className="image-stage">
            {(transformMode||effectsOpen)&&<WorkspaceDirectTools key={image.id} image={image} annotations={annotations} advanced={advancedItems} mode={transformMode??"effects"} busy={busy} zoom={zoom} onTransform={transform} onEffect={applyEffect} onCancel={()=>{setTransformMode(null);setEffectsOpen(false);}}/>}
            <div hidden={!!transformMode||effectsOpen}>
              <WorkspaceEditor imageToInsert={imageToInsert?.target===image.id?imageToInsert:undefined} onImageInserted={()=>setImageToInsert(undefined)} onFitChange={value=>{fitZoom.current=value;}} image={image} annotations={annotations} advancedItems={advancedItems} active={editing} busy={busy} zoom={zoom} onPixelSample={pointerColor.set} onZoomReport={setDisplayZoom} onZoomChange={setZoom} onAdvancedChange={updateAdvanced} onSelectDrawing={()=>{setTransformMode(null);setEffectsOpen(false);setEditing(true);}}/>
            </div>
          </div>}
        </section>
        </div>
      </main>
      <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(event) => { void openFiles(Array.from(event.target.files ?? [])); }} />
    </div></EditorToolbarProvider>
  );
}
