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
  const zoomAnchor=useRef<{x:number;y:number;clientX:number;clientY:number}|null>(null);
  const offset=useRef({x:0,y:0});
  const cameraImage=useRef(image.id);
  const resetCamera=()=>{offset.current={x:0,y:0};zoomAnchor.current=null;if(host.current)host.current.style.translate="0px 0px";};
  useLayoutEffect(()=>{if(cameraImage.current!==image.id){cameraImage.current=image.id;resetCamera();return;}const anchor=zoomAnchor.current;zoomAnchor.current=null;const node=host.current,canvas=node?.querySelector<HTMLElement>(".fershot-advanced-workbench__stage"),scroller=node?.closest<HTMLElement>(".stage");if(!node||!canvas||!scroller)return;if(!anchor){resetCamera();return;}const scale=zoom??fit;let box=canvas.getBoundingClientRect();const oldX=scroller.scrollLeft,oldY=scroller.scrollTop;scroller.scrollLeft+=box.left+anchor.x*scale-anchor.clientX;scroller.scrollTop+=box.top+anchor.y*scale-anchor.clientY;box=canvas.getBoundingClientRect();offset.current={x:offset.current.x-(box.left+anchor.x*scale-anchor.clientX),y:offset.current.y-(box.top+anchor.y*scale-anchor.clientY)};node.style.translate=`${offset.current.x}px ${offset.current.y}px`;if(scroller.scrollLeft!==oldX||scroller.scrollTop!==oldY||offset.current.x||offset.current.y)scroller.dispatchEvent(new Event("scroll"));},[zoom,fit,image.id]);
  useEffect(()=>{const reset=()=>{resetCamera();const scroller=host.current?.closest<HTMLElement>(".stage");if(scroller){scroller.scrollLeft=0;scroller.scrollTop=0;scroller.dispatchEvent(new Event("scroll"));}};window.addEventListener("fershot-editor-fit",reset);return()=>window.removeEventListener("fershot-editor-fit",reset);},[]);
  const wheelState=useRef({active,busy,scale:zoom??fit,fit,onZoomChange});wheelState.current={active,busy,scale:zoom??fit,fit,onZoomChange};
  useEffect(()=>{const node=host.current?.closest<HTMLElement>(".workspace-body");const scroller=host.current?.closest<HTMLElement>(".stage");if(!node||!scroller)return;
    let pinchStart:number|null=null,lastPanAt=-Infinity,pending:number|null=null,frame=0;let pointer:{x:number;y:number}|null=null,pendingPoint:{x:number;y:number}|null=null;
    const update=(value:number,point=pointer)=>{const state=wheelState.current;pending=Math.max(Math.min(.05,state.fit),Math.min(8,value));pendingPoint=point;if(!frame)frame=requestAnimationFrame(()=>{frame=0;const value=pending;pending=null;const current=wheelState.current;if(value===null||!current.active||current.busy||value===current.scale)return;const canvas=host.current?.querySelector<HTMLElement>(".fershot-advanced-workbench__stage");if(canvas){const box=canvas.getBoundingClientRect(),clip=scroller.getBoundingClientRect();const clientX=Math.max(clip.left,Math.min(clip.right,pendingPoint?.x??clip.left+clip.width/2)),clientY=Math.max(clip.top,Math.min(clip.bottom,pendingPoint?.y??clip.top+clip.height/2));zoomAnchor.current={x:(clientX-box.left)/current.scale,y:(clientY-box.top)/current.scale,clientX,clientY};}current.onZoomChange(value);});};
    const move=(event:MouseEvent)=>{pointer={x:event.clientX,y:event.clientY};};
    const wheel=(event:WheelEvent)=>{const state=wheelState.current;if(!state.active||state.busy||(!event.deltaX&&!event.deltaY)||(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable="true"],[role="slider"],[role="dialog"]')))return;
      const modified=event.ctrlKey||event.metaKey,now=performance.now(),legacy=(event as WheelEvent&{wheelDeltaY?:number}).wheelDeltaY;
      const continuous=event.deltaMode===0&&(Math.abs(event.deltaX)>0||event.deltaY%1!==0||Math.abs(event.deltaY)<15||(typeof legacy==="number"&&Math.abs(legacy)===Math.abs(event.deltaY)*3));
      const pan=!modified&&event.deltaMode===0&&(continuous||now-lastPanAt<300);
      event.preventDefault();
      if(pan){lastPanAt=now;const oldX=scroller.scrollLeft,oldY=scroller.scrollTop;scroller.scrollBy({left:event.deltaX,top:event.deltaY,behavior:"instant"});if(offset.current.x||offset.current.y){offset.current.x-=event.deltaX-(scroller.scrollLeft-oldX);offset.current.y-=event.deltaY-(scroller.scrollTop-oldY);if(host.current)host.current.style.translate=`${offset.current.x}px ${offset.current.y}px`;scroller.dispatchEvent(new Event("scroll"));}return;}
      if(pinchStart!==null)return;
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?scroller.clientHeight:1);
      update((pending??state.scale)*Math.exp(-Math.max(-240,Math.min(240,delta))*(event.ctrlKey?.01:.002)),{x:event.clientX,y:event.clientY});
    };
    const start=(event:Event)=>{if(!wheelState.current.active||wheelState.current.busy)return;event.preventDefault();pinchStart=pending??wheelState.current.scale;};
    const change=(event:Event)=>{if(pinchStart===null)return;event.preventDefault();const scale=(event as Event&{scale:number}).scale;if(Number.isFinite(scale)&&scale>0)update(pinchStart*scale);};
    const end=()=>{pinchStart=null;};
    node.addEventListener("mousemove",move);node.addEventListener("wheel",wheel,{passive:false});node.addEventListener("gesturestart",start,{passive:false});node.addEventListener("gesturechange",change,{passive:false});node.addEventListener("gestureend",end);
    return()=>{cancelAnimationFrame(frame);node.removeEventListener("mousemove",move);node.removeEventListener("wheel",wheel);node.removeEventListener("gesturestart",start);node.removeEventListener("gesturechange",change);node.removeEventListener("gestureend",end);};
  },[image.id]);
  useEffect(()=>onZoomReport(zoom??fit),[zoom,fit,onZoomReport]);
  return <div ref={host} className="editor-surface" aria-busy={busy}>
    <KonvaWorkbench onSourceReady={()=>onReady?.(image.id)} onSourceError={onLoadError} imageToInsert={imageToInsert} onImageInserted={onImageInserted} onPixelSample={onPixelSample} key={image.id} compact imageId={image.id} imageSrc={basePreview?.id===image.id?basePreview.src:image.src}
      imageWidth={image.width} imageHeight={image.height} zoom={zoom??fit} initialItems={advancedItems} busy={busy} disabled={!active}
      onToolChange={onSelectDrawing} onSnapshotChange={snapshot=>onAdvancedChange(image.id,snapshot.items)}/>
  </div>;
}
