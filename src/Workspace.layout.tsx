import { useState } from "react";
import type { ImageDocument } from "./contracts/media";
import { snapPlacementToEdges } from "./features/composition";
import type { LayoutLayerPlan, WorkspaceLayoutPlan } from "./platform/layout";

export function WorkspaceLayout({ images, selected, busy, onCompose }: {
  images: readonly ImageDocument[]; selected: ImageDocument; busy: boolean; onCompose: (plan: WorkspaceLayoutPlan) => void;
}) {
  const [layers, setLayers] = useState<readonly LayoutLayerPlan[]>([{ id: selected.id, x: 0, y: 0,
    width: selected.width, height: selected.height, zIndex: 0, opacity: 1 }]);
  const [width, setWidth] = useState(selected.width);
  const [height, setHeight] = useState(selected.height);
  const [scale, setScale] = useState(1);
  const [backdrop, setBackdrop] = useState(false);
  const [inset, setInset] = useState(64);
  const [cornerRadius, setCornerRadius] = useState(12);
  const [color, setColor] = useState("#e8edf5");
  const [shadow, setShadow] = useState(false);
  const [error, setError] = useState("");

  function update(id: string, patch: Partial<LayoutLayerPlan>) { setLayers(previous => previous.map(layer => layer.id === id ? { ...layer, ...patch } : layer)); }
  function stack() {
    let y = 0;
    const ordered = layers.map((layer, i) => {
      const next = { ...layer, x: 0, y, zIndex: i }; y += layer.height; return next;
    });
    setWidth(Math.max(1, ...ordered.map(layer => layer.width))); setHeight(Math.max(1, y)); setLayers(ordered);
  }
  function compose() {
    setError("");
    if (!Number.isFinite(scale) || scale <= 0 || scale > 8) { setError("Pixels per point must be greater than 0 and at most 8."); return; }
    onCompose({ canvasWidth: width, canvasHeight: height, displayScale: scale, layers: layers.map(layer => ({ ...layer })),
      backdrop: backdrop ? { inset, cornerRadius, fill: { kind: "solid", color },
        shadow: shadow ? { blur: 16, offsetX: 0, offsetY: 8, color: "#000000" } : null } : null });
  }
  return <section aria-label="Image composition controls">
    <h2>Compose images and backdrop</h2>
    <fieldset disabled={busy}>
      <legend>Source images (up to 32)</legend>
      {images.map(image => <label key={image.id}><input type="checkbox" checked={layers.some(layer => layer.id === image.id)}
        onChange={event => {
          if (!event.target.checked) setLayers(previous => previous.filter(layer => layer.id !== image.id));
          else if (layers.length < 32) setLayers(previous => [...previous, { id: image.id, x: 0, y: 0, width: image.width, height: image.height, zIndex: previous.length, opacity: 1 }]);
        }} />{image.name}</label>)}
      <div><label>Canvas width<input type="number" min="1" max="16384" value={width} onChange={event => setWidth(Number(event.target.value))} /></label>
      <label>Canvas height<input type="number" min="1" max="16384" value={height} onChange={event => setHeight(Number(event.target.value))} /></label>
      <label>Explicit pixels per point<input type="number" min="0.1" max="8" step="0.1" value={scale} onChange={event => setScale(Number(event.target.value))} /></label></div>
      <button type="button" disabled={!layers.length} onClick={stack}>Stack selected images vertically</button>
      {layers.map(layer => <fieldset key={layer.id}><legend>{images.find(image => image.id === layer.id)?.name ?? "Missing image"}</legend>
        {(["x", "y", "width", "height", "zIndex", "opacity"] as const).map(key => <label key={key}>{key}<input type="number" step={key === "opacity" ? 0.1 : 1}
          value={layer[key]} onChange={event => update(layer.id, { [key]: Number(event.target.value) })} /></label>)}
        <button type="button" onClick={() => {
          try { const snapped = snapPlacementToEdges(layer, layers.filter(item => item.id !== layer.id), width, height); update(layer.id, { x: snapped.x, y: snapped.y }); }
          catch (reason) { setError(reason instanceof Error ? reason.message : "Cannot snap this layer."); }
        }}>Snap this layer to edges</button>
      </fieldset>)}
      <label><input type="checkbox" checked={backdrop} onChange={event => setBackdrop(event.target.checked)} />Add backdrop</label>
      {backdrop && <div><label>Inset<input type="number" min="0" max="512" value={inset} onChange={event => setInset(Number(event.target.value))} /></label>
        <label>Corner radius<input type="number" min="0" max="256" value={cornerRadius} onChange={event => setCornerRadius(Number(event.target.value))} /></label>
        <label>Backdrop color<input type="color" value={color} onChange={event => setColor(event.target.value)} /></label>
        <label><input type="checkbox" checked={shadow} onChange={event => setShadow(event.target.checked)} />Add shadow</label></div>}
      <button type="button" disabled={!layers.length} onClick={compose}>Create composed image</button>
    </fieldset>
    <p>Creates a new PNG; source images and edits are preserved. Transparent canvas, explicit scale, up to 16 megapixels. Default scale 1 is a manual value, not detected Retina metadata.</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}
