import { openingEditorScale } from "./features/editor/konva/zoom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Annotation } from "./contracts/editor";
import type { ImageDocument } from "./contracts/media";
import { KonvaWorkbench } from "./features/editor/konva/KonvaWorkbench";
import { type AdvancedEditorItem } from "./features/editor/advanced-workbench";
import { renderAnnotatedDocument } from "./platform/annotations";

export function WorkspaceEditor({ image, annotations, advancedItems, active, busy, zoom, onPixelSample,onZoomReport,onZoomChange, onAdvancedChange, onSelectDrawing,onFitChange,imageToInsert,onImageInserted }: {
  imageToInsert?:{id:string;src:string;width:number;height:number};onImageInserted:()=>void;onFitChange:(zoom:number)=>void;
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
      const padX = (parseFloat(padding.paddingLeft) || 0) + (parseFloat(padding.paddingRight) || 0);
      const padY = (parseFloat(padding.paddingTop) || 0) + (parseFloat(padding.paddingBottom) || 0);
      const width = bounds.width - padX;
      const height = bounds.height - padY;
      if (width > 20 && height > 20 && image.width > 0 && image.height > 0) {
        // Do not compare against the compact window already resized around this image.
        setFit(openingEditorScale(image.width,image.height,window.screen.availWidth||innerWidth,window.screen.availHeight||innerHeight,width,height));
        onFitChange(Math.min(1,width/image.width,height/image.height));
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    measure();
    return () => observer.disconnect();
  }, [image.width, image.height, active]);
  const pinchStart=useRef<number|null>(null);
  const isTrackpad=useRef(false);
  const trackpadTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{const node=host.current;if(!node)return;
    const update=(value:number)=>onZoomChange(Math.max(Math.min(.05,fit),Math.min(8,value)));
    const wheel=(event:WheelEvent)=>{
      if(!active||busy||event.deltaY===0)return;
      const isPinch=event.ctrlKey||event.metaKey;
      if(!isPinch){
        const isContinuous=event.deltaMode===0&&(Math.abs(event.deltaX)>0||event.deltaY%1!==0||Math.abs(event.deltaY)<15);
        if(isContinuous){
          isTrackpad.current=true;
          if(trackpadTimer.current)clearTimeout(trackpadTimer.current);
          trackpadTimer.current=setTimeout(()=>{isTrackpad.current=false;},300);
        }
        if(isTrackpad.current)return;
      }
      event.preventDefault();
      if(isPinch){
        if(pinchStart.current===null)update((zoom??fit)*Math.exp(-event.deltaY*.01));
      }else{
        update((zoom??fit)*Math.exp(-event.deltaY*.002));
      }
    };
    const start=(event:Event)=>{if(!active||busy)return;event.preventDefault();pinchStart.current=zoom??fit;};
    const change=(event:Event)=>{if(pinchStart.current===null)return;event.preventDefault();const scale=(event as Event&{scale:number}).scale;if(Number.isFinite(scale)&&scale>0)update(pinchStart.current*scale);};
    const end=()=>{pinchStart.current=null;};
    node.addEventListener("wheel",wheel,{passive:false});node.addEventListener("gesturestart",start,{passive:false});node.addEventListener("gesturechange",change,{passive:false});node.addEventListener("gestureend",end);
    return()=>{
      if(trackpadTimer.current)clearTimeout(trackpadTimer.current);
      node.removeEventListener("wheel",wheel);node.removeEventListener("gesturestart",start);node.removeEventListener("gesturechange",change);node.removeEventListener("gestureend",end);
    };
  },[active,busy,zoom,fit,onZoomChange]);
  useEffect(()=>onZoomReport(zoom??fit),[zoom,fit,onZoomReport]);
  return <div ref={host} className="editor-surface" aria-busy={busy}>
    <KonvaWorkbench imageToInsert={imageToInsert} onImageInserted={onImageInserted} onPixelSample={onPixelSample} key={image.id} compact imageId={image.id} imageSrc={basePreview?.id===image.id?basePreview.src:image.src}
      imageWidth={image.width} imageHeight={image.height} zoom={zoom??fit} initialItems={advancedItems} busy={busy} disabled={!active}
      onToolChange={onSelectDrawing} onSnapshotChange={snapshot=>onAdvancedChange(image.id,snapshot.items)}/>
  </div>;
}
