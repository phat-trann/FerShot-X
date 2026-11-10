import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Annotation } from "./contracts/editor";
import type { ImageDocument } from "./contracts/media";
import { KonvaWorkbench } from "./features/editor/konva/KonvaWorkbench";
import { type AdvancedEditorItem } from "./features/editor/advanced-workbench";
import { renderAnnotatedDocument } from "./platform/annotations";

export function WorkspaceEditor({ image, annotations, advancedItems, active, busy, zoom, onPixelSample,onZoomReport,onZoomChange, onAdvancedChange, onSelectDrawing }: {
  image: ImageDocument; annotations: readonly Annotation[]; active: boolean; busy: boolean; zoom: number | null;
  advancedItems: readonly AdvancedEditorItem[];
  onPixelSample:(hex:string)=>void;
  onZoomReport:(zoom:number)=>void;
  onZoomChange:(value:number)=>void;
  onChange?: (id: string, annotations: readonly Annotation[]) => void;
  onSelectDrawing?: () => void;
  onAdvancedChange: (id: string, items: readonly AdvancedEditorItem[]) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [advancedMode] = useState(true);
  const [basePreview, setBasePreview] = useState<{ id: string; src: string } | null>(null);
  useEffect(() => {
    let live = true;
    let owned: string | undefined;
    setBasePreview(null);
    if (advancedMode && annotations.length) {
      void renderAnnotatedDocument(image, annotations).then(rendered => {
        if (!live) { URL.revokeObjectURL(rendered.src); return; }
        owned = rendered.src; setBasePreview({ id: image.id, src: owned });
      }).catch(() => { /* Main export reports raster errors; the original remains available. */ });
    }
    return () => { live = false; if (owned) URL.revokeObjectURL(owned); };
  }, [image.id, image.src, annotations, advancedMode]);
  useLayoutEffect(() => {
    const node = host.current;
    const stage = node?.closest(".stage");
    if (!node || !stage) return;
    const measure = () => {
      const bounds = stage.getBoundingClientRect();
      const padding = getComputedStyle(stage);
      const bar = node.querySelector(".fershot-editor-workbench__bar")?.getBoundingClientRect().height ?? 0;
      const width = bounds.width - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
      const height = bounds.height - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom) - bar - 24;
      setFit(Math.max(Number.EPSILON, Math.min(1, Math.max(1, width) / image.width, Math.max(1, height) / image.height)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    const bar = node.querySelector(".fershot-editor-workbench__bar");
    if (bar) observer.observe(bar);
    measure();
    return () => observer.disconnect();
  }, [image.width, image.height, active]);
  useEffect(()=>{const node=host.current;if(!node)return;const wheel=(event:WheelEvent)=>{if(!active||busy||event.deltaY===0)return;event.preventDefault();onZoomChange(Math.max(.05,Math.min(8,(zoom??fit)*Math.exp(-event.deltaY*.002))));};node.addEventListener("wheel",wheel,{passive:false});return()=>node.removeEventListener("wheel",wheel);},[active,busy,zoom,fit,onZoomChange]);
  useEffect(()=>onZoomReport(zoom??fit),[zoom,fit,onZoomReport]);
  return <div ref={host} hidden={!active} className="editor-surface" aria-busy={busy}>
    <KonvaWorkbench onPixelSample={onPixelSample} key={image.id} compact imageId={image.id} imageSrc={basePreview?.id===image.id?basePreview.src:image.src}
      imageWidth={image.width} imageHeight={image.height} zoom={zoom??fit} initialItems={advancedItems} busy={busy} disabled={!active}
      onToolChange={onSelectDrawing} onSnapshotChange={snapshot=>onAdvancedChange(image.id,snapshot.items)}/>
  </div>;
}
