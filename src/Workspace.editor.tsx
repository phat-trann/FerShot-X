import { openingEditorScale } from "./features/editor/konva/zoom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Annotation } from "./contracts/editor";
import type { ImageDocument } from "./contracts/media";
import { KonvaWorkbench } from "./features/editor/konva/KonvaWorkbench";
import { type AdvancedEditorItem } from "./features/editor/advanced-workbench";
import { renderAnnotatedDocument } from "./platform/annotations";

export function WorkspaceEditor({ onReady,onLoadError,image, annotations, advancedItems, active, busy, zoom, onPixelSample,onZoomReport,onZoomChange, onAdvancedChange, onSelectDrawing,onFitChange,imageToInsert,onImageInserted }: {
  onReady?:(id:string)=>void;onLoadError?:()=>void;
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
  const [basePreview, setBasePreview] = useState<{ id: string; src: string } | null>(null);
  useEffect(() => {
    let live = true;
    let owned: string | undefined;
    setBasePreview(null);
    if (annotations.length) {
      void renderAnnotatedDocument(image, annotations).then(rendered => {
        if (!live) { URL.revokeObjectURL(rendered.src); return; }
        owned = rendered.src; setBasePreview({ id: image.id, src: owned });
      }).catch(() => { /* Main export reports raster errors; the original remains available. */ });
    }
    return () => { live = false; if (owned) URL.revokeObjectURL(owned); };
  }, [image.id, image.src, annotations]);
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
  const wheelState=useRef({active,busy,scale:zoom??fit,fit,onZoomChange});wheelState.current={active,busy,scale:zoom??fit,fit,onZoomChange};
  useEffect(()=>{const node=host.current?.closest<HTMLElement>(".workspace-body");const scroller=host.current?.closest<HTMLElement>(".stage");if(!node||!scroller)return;
    let pinchStart:number|null=null,lastPanAt=-Infinity,pending:number|null=null,frame=0;
    const update=(value:number)=>{const state=wheelState.current;pending=Math.max(Math.min(.05,state.fit),Math.min(8,value));if(!frame)frame=requestAnimationFrame(()=>{frame=0;const value=pending;pending=null;if(value!==null&&wheelState.current.active&&!wheelState.current.busy)wheelState.current.onZoomChange(value);});};
    const wheel=(event:WheelEvent)=>{const state=wheelState.current;if(!state.active||state.busy||(!event.deltaX&&!event.deltaY)||(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable="true"],[role="slider"],[role="dialog"]')))return;
      const modified=event.ctrlKey||event.metaKey,now=performance.now(),legacy=(event as WheelEvent&{wheelDeltaY?:number}).wheelDeltaY;
      const continuous=event.deltaMode===0&&(Math.abs(event.deltaX)>0||event.deltaY%1!==0||Math.abs(event.deltaY)<15||(typeof legacy==="number"&&Math.abs(legacy)===Math.abs(event.deltaY)*3));
      const pan=!modified&&event.deltaMode===0&&(continuous||now-lastPanAt<300);
      event.preventDefault();
      if(pan){lastPanAt=now;scroller.scrollBy({left:event.deltaX,top:event.deltaY,behavior:"instant"});return;}
      if(pinchStart!==null)return;
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?scroller.clientHeight:1);
      update((pending??state.scale)*Math.exp(-Math.max(-240,Math.min(240,delta))*(event.ctrlKey?.01:.002)));
    };
    const start=(event:Event)=>{if(!wheelState.current.active||wheelState.current.busy)return;event.preventDefault();pinchStart=pending??wheelState.current.scale;};
    const change=(event:Event)=>{if(pinchStart===null)return;event.preventDefault();const scale=(event as Event&{scale:number}).scale;if(Number.isFinite(scale)&&scale>0)update(pinchStart*scale);};
    const end=()=>{pinchStart=null;};
    node.addEventListener("wheel",wheel,{passive:false});node.addEventListener("gesturestart",start,{passive:false});node.addEventListener("gesturechange",change,{passive:false});node.addEventListener("gestureend",end);
    return()=>{cancelAnimationFrame(frame);node.removeEventListener("wheel",wheel);node.removeEventListener("gesturestart",start);node.removeEventListener("gesturechange",change);node.removeEventListener("gestureend",end);};
  },[image.id]);
  useEffect(()=>onZoomReport(zoom??fit),[zoom,fit,onZoomReport]);
  return <div ref={host} className="editor-surface" aria-busy={busy}>
    <KonvaWorkbench onSourceReady={()=>onReady?.(image.id)} onSourceError={onLoadError} imageToInsert={imageToInsert} onImageInserted={onImageInserted} onPixelSample={onPixelSample} key={image.id} compact imageId={image.id} imageSrc={basePreview?.id===image.id?basePreview.src:image.src}
      imageWidth={image.width} imageHeight={image.height} zoom={zoom??fit} initialItems={advancedItems} busy={busy} disabled={!active}
      onToolChange={onSelectDrawing} onSnapshotChange={snapshot=>onAdvancedChange(image.id,snapshot.items)}/>
  </div>;
}
