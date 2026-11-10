import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageDocument } from "../../contracts/media";
import type { WorkspaceLayoutPlan } from "../../platform/layout";
import { renderCompositionToCanvas } from "../composition/composition";
import { renderBackdropToCanvas } from "../backdrop/backdrop-renderer";

/** Reuses export drawing code, cached decoded sources and canvas buffers; no PNG encoding on drag. */
export type PrepareLayoutSource = (image: ImageDocument) => Promise<{ image: ImageDocument; dispose: () => void }>;
export function DirectLayoutRasterPreview({ images, plan, prepareSource }: { images: readonly ImageDocument[]; plan: WorkspaceLayoutPlan; prepareSource?: PrepareLayoutSource }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const composite = useRef<HTMLCanvasElement | undefined>(undefined);
  const decoded = useRef(new Map<string, { src: string; node: HTMLImageElement; ready: Promise<HTMLImageElement>; prepare?: PrepareLayoutSource; release: () => void }>());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const sourceKey = [...plan.layers.map(layer => layer.id), ...(plan.backdropImageId ? [plan.backdropImageId] : [])].join("\0");
  const sources = useMemo(() => {
    const ids = new Set(sourceKey.split("\0"));
    return images.filter(image => ids.has(image.id));
  }, [images, sourceKey]);
  useEffect(() => { setReady(false); }, [sources]);
  useEffect(() => {
    // jsdom cannot draw pixels; browser acceptance exercises this path with real canvases.
    if (typeof CanvasRenderingContext2D === "undefined") return;
    let live = true; let frame = 0;
    try {
      const ids = new Set(sources.map(source => source.id));
      for (const [id, entry] of decoded.current) if (!ids.has(id)) { entry.release(); decoded.current.delete(id); }
      let pixels = 0;
      const pending = sources.map(source => {
        pixels += source.width * source.height;
        if (pixels > 16_777_216) throw new Error("Combined layout source pixels exceed 16 megapixels.");
        const cached = decoded.current.get(source.id);
        if (cached?.src === source.src && cached.prepare === prepareSource) return cached.ready;
        cached?.release();
        if (!/^(blob:|data:image\/)/.test(source.src)) throw new Error("Layout preview requires a local image.");
        const node = new Image(); let disposed = false; let dispose = () => {};
        const promise = Promise.resolve().then(() => prepareSource ? prepareSource(source) : { image: source, dispose: () => {} }).then(async prepared => {
          dispose = prepared.dispose;
          if (disposed) { dispose(); throw new Error("Layout source preparation was cancelled."); }
          node.src = prepared.image.src; await node.decode();
          if (node.naturalWidth !== source.width || node.naturalHeight !== source.height) throw new Error("Layout source dimensions changed.");
          return node;
        });
        void promise.catch(() => {});
        decoded.current.set(source.id, { src: source.src, node, ready: promise, prepare: prepareSource,
          release: () => { if (!disposed) { disposed = true; node.src = ""; dispose(); } } });
        return promise;
      });
      void Promise.all(pending).then(nodes => {
        if (!live) return;
        frame = requestAnimationFrame(() => {
          if (!live || !canvas.current) return;
          try {
            const sourceMap = new Map(sources.map((source, index) => [source.id, nodes[index]!]));
            const layers = plan.layers.map(layer => {
              const source = sourceMap.get(layer.id); if (!source) throw new Error("A layout source is unavailable.");
              return { ...layer, source };
            });
            const target = plan.backdrop ? (composite.current ??= document.createElement("canvas")) : canvas.current;
            const pixels = renderCompositionToCanvas({ canvasWidth: plan.canvasWidth, canvasHeight: plan.canvasHeight, layers }, target);
            if (plan.backdrop) {
              const background = plan.backdropImageId ? sourceMap.get(plan.backdropImageId) : undefined;
              if (plan.backdropImageId && !background) throw new Error("Backdrop source is unavailable.");
              renderBackdropToCanvas({ ...plan.backdrop, source: pixels, sourceWidth: plan.canvasWidth, sourceHeight: plan.canvasHeight,
                ...(background ? { fill: { kind: "image" as const, source: background } } : {}) }, canvas.current);
            }
            setError(""); setReady(true);
          } catch { setError("Layout preview is unavailable. Check canvas size, colors and source images."); setReady(false); }
        });
      }).catch(() => { if (live) { setError("A layout source could not be decoded."); setReady(false); } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Layout preview is unavailable."); setReady(false); }
    return () => { live = false; cancelAnimationFrame(frame); };
  }, [sources, plan, prepareSource]);
  useEffect(() => () => { for (const entry of decoded.current.values()) entry.release(); decoded.current.clear(); }, []);
  return <>
    <canvas ref={canvas} role="img" aria-label="Rendered composition preview" data-testid="direct-layout-raster" data-ready={ready}
      data-backdrop-image-id={plan.backdropImageId ?? ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", visibility: ready ? "visible" : "hidden" }} />
    {error && <p role="alert" className="direct-layout-preview-error">{error}</p>}
  </>;
}
