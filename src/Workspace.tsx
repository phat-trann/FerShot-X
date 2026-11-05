import { useEffect, useRef, useState, type MouseEvent, type FormEvent } from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "./contracts/settings";
import { PreferenceControls } from "./Workspace.preferences";
import type { Annotation } from "./contracts/editor";
import { withAnnotations, renderAnnotatedDocument } from "./platform/annotations";
import { WorkspaceEditor } from "./Workspace.editor";
import type { CaptureMode, ImageDocument } from "./contracts/media";
import { mapClientPoint } from "./features/point-map";
import { inspectImagePixel, type InspectedPixel } from "./platform/pixel-inspection";
import { importImage } from "./platform/import-image";
import { captureImage, copyImage, importClipboardImage, NativeOperationError, pinImage, documentFromPin, readAppInfo, readPreferences, savePreferences, saveImage, transformImage, type ProcessOptions } from "./platform/native";
import { LibraryPanel } from "./features/library/LibraryPanel";
import { CapturePanel } from "./features/capture/CapturePanel";
import { TransformTools } from "./Workspace.tools";
import "./Workspace.css";

export default function Workspace() {
  const [images, setImages] = useState<ImageDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [runtimeLabel, setRuntimeLabel] = useState("Local workspace");
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...DEFAULT_SETTINGS }));
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferenceNotice, setPreferenceNotice] = useState("");
  const [notice, setNotice] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [annotationsById, setAnnotationsById] = useState<ReadonlyMap<string, readonly Annotation[]>>(() => new Map());
  const [pixel, setPixel] = useState<{ imageId: string; value: InspectedPixel } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const liveImages = useRef<ImageDocument[]>([]);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const image = images.find((item) => item.id === selectedId);
  const annotations = image ? annotationsById.get(image.id) ?? [] : [];

  function addDocument(next: ImageDocument) {
    if (!mounted.current) { URL.revokeObjectURL(next.src); return; }
    liveImages.current = [...liveImages.current, next];
    setImages([...liveImages.current]);
    setSelectedId(next.id);
    setZoom(null);
  }

  async function operate(operation: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError(""); setNotice("");
    try { await operation(); }
    catch (reason) {
      if (reason instanceof NativeOperationError && reason.code === "cancelled") setNotice("Capture cancelled.");
      else setError(reason instanceof Error ? reason.message : "The image operation failed.");
    } finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  }

  function openClipboard() {
    void operate(async () => { addDocument(await importClipboardImage()); setNotice("Clipboard image opened."); });
  }

  function capture(mode: CaptureMode) {
    void operate(async () => {
      setCapturing(true);
      try { addDocument(await captureImage(mode)); setNotice("Capture opened."); }
      finally { if (mounted.current) setCapturing(false); }
    });
  }

  function transform(options: ProcessOptions) {
    if (!image) return;
    void operate(async () => { addDocument(await withAnnotations(image, annotations, (rendered) => transformImage(rendered, options))); setNotice("New image created; original preserved."); });
  }

  function samplePixel(point: { x: number; y: number }) {
    if (!image || !inspecting || busyRef.current) return;
    void operate(async () => {
      const value = await inspectImagePixel(image, point);
      if (mounted.current) { setPixel({ imageId: image.id, value }); setNotice("Pixel color sampled."); }
    });
  }

  function inspect(event: MouseEvent<HTMLImageElement>) {
    if (!image || !inspecting || busyRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const mapped = mapClientPoint({ x: event.clientX, y: event.clientY },
      { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height }, image);
    samplePixel({ x: Math.min(image.width - 1, Math.floor(mapped.x)), y: Math.min(image.height - 1, Math.floor(mapped.y)) });
  }

  function inspectCoordinates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    samplePixel({ x: Number(values.get("x")), y: Number(values.get("y")) });
  }

  function updateAnnotations(id: string, next: readonly Annotation[]) {
    if (!liveImages.current.some((document) => document.id === id)) return;
    setAnnotationsById((previous) => new Map(previous).set(id, next));
  }

  function mergeAnnotations() {
    if (!image) return;
    void operate(async () => {
      addDocument(await renderAnnotatedDocument(image, annotations));
      setNotice("Merged image created; original and edit history preserved.");
    });
  }

  function pin() {
    if (!image) return;
    void operate(async () => { await withAnnotations(image, annotations, pinImage); setNotice("Image pinned."); });
  }

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/core").then(async ({ isTauri }) => {
      if (!isTauri()) return;
      const { listen } = await import("@tauri-apps/api/event");
      const dispose = await listen<import("./platform/native").PinWire>("ferby-pin-edit", ({ payload }) => {
        if (!active) return;
        const existing = liveImages.current.find((item) => item.id === payload.sourceId);
        if (existing) { setSelectedId(existing.id); setZoom(null); }
        else {
          try { addDocument(documentFromPin(payload)); }
          catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to restore pinned image."); return; }
        }
        setEditing(true); setInspecting(false);
      });
      if (!active) dispose(); else unlisten = dispose;
    }).catch(() => { /* Event support may be absent in browser/mock transports. */ });
    return () => { active = false; unlisten?.(); };
  }, []);

  function copy() {
    if (!image) return;
    void operate(async () => { await withAnnotations(image, annotations, copyImage); setNotice("Image copied to clipboard."); });
  }

  function save() {
    if (!image) return;
    void operate(async () => { const saved = await withAnnotations(image, annotations, (rendered) => saveImage(rendered, settings.saveFormat, settings.jpegQuality)); setNotice(saved ? "Image saved." : "Save cancelled."); });
  }

  function persistPreferences() {
    void operate(async () => { setSettings(await savePreferences(settings)); setPreferenceNotice("Preferences saved."); });
  }

  useEffect(() => {
    let active = true;
    void readPreferences().then((loaded) => { if (active) setSettings(loaded); })
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
    return () => { mounted.current = false; liveImages.current.forEach((item) => URL.revokeObjectURL(item.src)); };
  }, []);

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

  function removeImage(id: string) {
    if (busyRef.current) return;
    const removed = liveImages.current.find((item) => item.id === id);
    if (removed) URL.revokeObjectURL(removed.src);
    setAnnotationsById((previous) => { const next = new Map(previous); next.delete(id); return next; });
    liveImages.current = liveImages.current.filter((item) => item.id !== id);
    setImages([...liveImages.current]);
    if (selectedId === id) setSelectedId(liveImages.current[liveImages.current.length - 1]?.id ?? null);
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">⌘</span><div>Ferby<span>SHOTTR</span></div></div>
        <button className="open-button" onClick={() => picker.current?.click()} disabled={busy}>＋ Open image</button>
        <button className="open-button clipboard-open" disabled={busy} onClick={openClipboard}>Open clipboard image</button>
        <fieldset className="capture-controls" disabled={busy} aria-label="Capture controls">
          <CapturePanel onCapture={capture} busy={capturing} />
        </fieldset>
        <fieldset className="library-controls" disabled={busy} aria-label="Session library controls">
          <LibraryPanel images={images} selectedId={selectedId}
            onSelect={(id) => { if (!busyRef.current) { setSelectedId(id); setZoom(null); } }}
            onRemove={removeImage} />
        </fieldset>
        <div className="sidebar-bottom"><span className="status-dot" /> Images stay on this device<small>{runtimeLabel}</small></div>
      </aside>
      <main className="main-panel">
        <header className="topbar"><div className="document-title">{image?.name ?? "Your next great capture"}<span>{image ? `${image.width} × ${image.height} px` : "A little clarity goes a long way."}</span></div><PreferenceControls settings={settings} ready={preferencesReady} busy={busy} notice={preferenceNotice} onChange={setSettings} onSave={persistPreferences} /></header>
        <div className="toolbar"><div><span>{editing ? "Annotations" : "Original preview"}</span>{image && <button className="inspect-toggle" disabled={busy} aria-pressed={editing} onClick={() => { setEditing((value) => !value); setInspecting(false); }}>Annotate image</button>}{image && <button className="inspect-toggle" disabled={busy} aria-pressed={inspecting} onClick={() => { setInspecting((value) => !value); setEditing(false); }}>Inspect color</button>}{image && <TransformTools key={image.id} image={image} busy={busy} onTransform={transform} />}</div>
          <div className="zoom-controls"><button disabled={!image || busy} aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.1, (value ?? 1) - 0.25))}>−</button><span>{zoom === null ? "Fit" : `${Math.round(zoom * 100)}%`}</span><button disabled={!image || busy} aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(4, (value ?? 1) + 0.25))}>＋</button><button disabled={!image || busy} onClick={() => setZoom(null)}>Fit</button>{image && <button disabled={busy} onClick={() => removeImage(image.id)} aria-label={`Close ${image.name}`}>Close</button>}</div>
        </div>
        {image && <div className="export-toolbar"><label>Export format<select aria-label="Export format" disabled={busy || !preferencesReady} value={settings.saveFormat} onChange={(event) => setSettings((previous) => ({ ...previous, saveFormat: event.target.value as AppSettings["saveFormat"] }))}><option value="png">PNG</option><option value="jpeg">JPEG</option></select></label><button disabled={busy} onClick={copy}>Copy image</button><button disabled={busy} onClick={pin}>Pin image</button><button disabled={busy || !annotations.length} onClick={mergeAnnotations}>Merge annotations</button><button disabled={busy} onClick={save}>Save image…</button><span>Original files are never overwritten.</span></div>}
        {image && inspecting && <div className="pixel-inspector">
          <form key={image.id} onSubmit={inspectCoordinates} aria-label="Inspect pixel coordinates">
            <label>X<input aria-label="Pixel X" type="number" name="x" defaultValue="0" min="0" max={image.width - 1} step="1" required disabled={busy} /></label>
            <label>Y<input aria-label="Pixel Y" type="number" name="y" defaultValue="0" min="0" max={image.height - 1} step="1" required disabled={busy} /></label>
            <button disabled={busy}>Sample color</button>
          </form>
          <output role="status" aria-label="Pixel color">{pixel?.imageId === image.id ? <><span className="pixel-swatch" aria-hidden="true" style={{ backgroundColor: `rgba(${pixel.value.r},${pixel.value.g},${pixel.value.b},${pixel.value.a / 255})` }} />
            <span>{pixel.value.hex} · RGBA {pixel.value.r}, {pixel.value.g}, {pixel.value.b}, {pixel.value.a} · Pixel {pixel.value.x}, {pixel.value.y}</span></> : "Click the image or enter coordinates."}</output>
        </div>}
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
        <section className={`stage ${dragging ? "dragging" : ""} ${image ? "has-image" : ""}`} aria-label="Image workspace" aria-busy={busy}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); void openFiles(Array.from(event.dataTransfer.files)); }}>
          {image ? <div className="image-stage"><img hidden={editing} className={`canvas-image ${zoom === null ? "fit-image" : ""} ${inspecting ? "inspect-image" : ""}`} onClick={inspect} src={image.src} alt={image.name} style={zoom === null ? undefined : { width: image.width * zoom, maxWidth: "none", maxHeight: "none" }} /><WorkspaceEditor image={image} annotations={annotations} active={editing} busy={busy} zoom={zoom} onChange={updateAnnotations} /></div> :
            <div className="empty-state"><div className="empty-illustration" aria-hidden="true"><div className="picture-sun" /><div className="picture-mountain" /><span>＋</span></div><p className="eyebrow">A SPACE FOR YOUR IMAGES</p><h1>Bring the details into focus.</h1><p>Drop an image here to take a closer look,<br />or open one from your Mac.</p><button className="primary-button" onClick={() => picker.current?.click()} disabled={busy}>{busy ? "Opening…" : "Open an image"}<span aria-hidden="true">↗</span></button><small>PNG, JPEG, WebP or GIF · up to 20 MB</small></div>}
        </section>
        <footer className="statusbar"><span role="status" aria-live="polite">{busy ? "Working…" : notice || (image ? "Image · session only" : "Ready when you are")}</span><span>{images.length} {images.length === 1 ? "image" : "images"}</span></footer>
      </main>
      <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(event) => { void openFiles(Array.from(event.target.files ?? [])); }} />
    </div>
  );
}
