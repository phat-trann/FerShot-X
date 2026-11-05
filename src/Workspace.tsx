import { useEffect, useRef, useState } from "react";
import type { ImageDocument } from "./contracts/media";
import { importImage } from "./platform/import-image";
import { readAppInfo } from "./platform/native";
import "./Workspace.css";

export default function Workspace() {
  const [images, setImages] = useState<ImageDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [runtimeLabel, setRuntimeLabel] = useState("Local workspace");
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const liveImages = useRef<ImageDocument[]>([]);
  const image = images.find((item) => item.id === selectedId);

  useEffect(() => {
    let active = true;
    void readAppInfo().then((info) => {
      if (active && info) setRuntimeLabel(`v${info.version} · ${info.platform}`);
    }).catch(() => { if (active) setRuntimeLabel("Desktop connection unavailable"); });
    return () => { active = false; };
  }, []);
  useEffect(() => () => { liveImages.current.forEach((item) => URL.revokeObjectURL(item.src)); }, []);

  async function openFiles(files: File[]) {
    if (!files.length || busy) return;
    setBusy(true);
    setError("");
    try {
      for (const file of files) {
        const next = await importImage(file);
        liveImages.current = [...liveImages.current, next];
        setImages([...liveImages.current]);
        setSelectedId(next.id);
        setZoom(null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open this image.");
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = "";
    }
  }

  function removeImage(id: string) {
    const removed = liveImages.current.find((item) => item.id === id);
    if (removed) URL.revokeObjectURL(removed.src);
    liveImages.current = liveImages.current.filter((item) => item.id !== id);
    setImages([...liveImages.current]);
    if (selectedId === id) setSelectedId(liveImages.current[liveImages.current.length - 1]?.id ?? null);
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">⌘</span><div>Ferby<span>SHOTTR</span></div></div>
        <button className="open-button" onClick={() => picker.current?.click()} disabled={busy}>＋ Open image</button>
        <div className="section-label">WORKSPACE <span>{images.length}</span></div>
        <div className="image-list" aria-label="Open images">
          {images.length === 0 && <p className="sidebar-hint">Your images will appear here.</p>}
          {images.map((item) => <button key={item.id} className={`image-item ${selectedId === item.id ? "selected" : ""}`} onClick={() => { setSelectedId(item.id); setZoom(null); }} aria-pressed={selectedId === item.id}>
            <img src={item.src} alt="" /><span>{item.name}<small>{item.width} × {item.height}</small></span>
          </button>)}
        </div>
        <div className="sidebar-bottom"><span className="status-dot" /> Images stay on this device<small>{runtimeLabel}</small></div>
      </aside>
      <main className="main-panel">
        <header className="topbar"><div className="document-title">{image?.name ?? "Your next great capture"}<span>{image ? `${image.width} × ${image.height} px` : "A little clarity goes a long way."}</span></div><kbd>LOCAL</kbd></header>
        <div className="toolbar"><div><span>Preview</span>{image && <span className="muted">{image.mimeType.replace("image/", "").toUpperCase()}</span>}</div>
          <div className="zoom-controls"><button disabled={!image} aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.1, (value ?? 1) - 0.25))}>−</button><span>{zoom === null ? "Fit" : `${Math.round(zoom * 100)}%`}</span><button disabled={!image} aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(4, (value ?? 1) + 0.25))}>＋</button><button disabled={!image} onClick={() => setZoom(null)}>Fit</button>{image && <button onClick={() => removeImage(image.id)} aria-label={`Close ${image.name}`}>Close</button>}</div>
        </div>
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
        <section className={`stage ${dragging ? "dragging" : ""} ${image ? "has-image" : ""}`} aria-label="Image workspace" aria-busy={busy}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); void openFiles(Array.from(event.dataTransfer.files)); }}>
          {image ? <img className={`canvas-image ${zoom === null ? "fit-image" : ""}`} src={image.src} alt={image.name} style={zoom === null ? undefined : { width: image.width * zoom, maxWidth: "none", maxHeight: "none" }} /> :
            <div className="empty-state"><div className="empty-illustration" aria-hidden="true"><div className="picture-sun" /><div className="picture-mountain" /><span>＋</span></div><p className="eyebrow">A SPACE FOR YOUR IMAGES</p><h1>Bring the details into focus.</h1><p>Drop an image here to take a closer look,<br />or open one from your Mac.</p><button className="primary-button" onClick={() => picker.current?.click()} disabled={busy}>{busy ? "Opening…" : "Open an image"}<span aria-hidden="true">↗</span></button><small>PNG, JPEG, WebP or GIF · up to 20 MB</small></div>}
        </section>
        <footer className="statusbar"><span>{busy ? "Opening image…" : image ? "Original image · session only" : "Ready when you are"}</span><span>{images.length} {images.length === 1 ? "image" : "images"}</span></footer>
      </main>
      <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(event) => { void openFiles(Array.from(event.target.files ?? [])); }} />
    </div>
  );
}
