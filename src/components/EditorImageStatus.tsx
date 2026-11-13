import {Slider} from "./ui/slider";
import type { PointerColor } from "./pointer-color";
import { useEffect,useRef,useState,useSyncExternalStore } from "react";
import "./EditorImageStatus.css";
import { Button } from "./ui/button";
import type { ImageDocument } from "../contracts/media";
import { Input } from "./ui/input";

function PointerColorCell({source}:{source:PointerColor}){const color=useSyncExternalStore(source.subscribe,source.getSnapshot,source.getSnapshot);return <div className="editor-status-cell editor-color-status" aria-label="Color under pointer"><span className="editor-color-swatch" style={{backgroundColor:color}}/><span><output aria-label="Pointer color">{color}</output><small>Tab to copy</small></span></div>;}
export function EditorImageStatus({image,colorSource,zoom,fitZoom,busy,onFit,onZoom,onResize}:{image?:ImageDocument;colorSource:PointerColor;zoom:number;fitZoom:number;busy:boolean;onFit:()=>void;onZoom:(zoom:number)=>void;onResize:(width:number,height:number)=>void}){
 const host=useRef<HTMLDivElement>(null),zoomHost=useRef<HTMLDivElement>(null),zoomTrigger=useRef<HTMLButtonElement>(null);
 const [zoomOpen,setZoomOpen]=useState(false);
 const fitPercent=fitZoom*100,fitPosition=Math.max(0,Math.min(1,(fitPercent-1)/799));
 const [width,setWidth]=useState(image?.width??1),[height,setHeight]=useState(image?.height??1),[factor,setFactor]=useState(1),[open,setOpen]=useState(false);
 useEffect(()=>{setWidth(image?.width??1);setHeight(image?.height??1);setFactor(1);setOpen(false);setZoomOpen(false);},[image?.id,image?.width,image?.height]);
 useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!host.current?.contains(event.target))setOpen(false);};const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};},[open]);
 useEffect(()=>{if(!zoomOpen)return;const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!zoomHost.current?.contains(event.target))setZoomOpen(false);};const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();setZoomOpen(false);zoomTrigger.current?.focus();}};document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape,true);return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape,true);};},[zoomOpen]);
 function preset(value:number){if(!image)return;setFactor(value);setWidth(Math.max(1,Math.round(image.width*value)));setHeight(Math.max(1,Math.round(image.height*value)));}
 return <div className="editor-status-strip">
  <PointerColorCell source={colorSource}/>
  <div ref={host} className="editor-image-status"><Button variant="plain" type="button" className="editor-status-cell editor-status-button" aria-label="Image size" aria-expanded={open} disabled={!image||busy} onClick={()=>{setZoomOpen(false);setOpen(value=>!value);}}><span>{image?`${image.width}×${image.height}px`:"—"}</span><small>Image size</small></Button>
   {open&&image&&<section className="editor-size-popover" aria-label="Resize image">
    <strong>Resize Image <span>(can't be undone!)</span></strong>
    <div className="editor-size-presets">{([.25,.33,.5,1,2,4]as const).map(value=><Button key={value} variant={factor===value?"default":"ghost"} size="sm" aria-pressed={factor===value} onClick={()=>preset(value)}>{value<1?`${Math.round(value*100)}%`:`${value}×`}</Button>)}</div>
    <div className="editor-size-fields">
     <Input aria-label="Resize width" type="number" min={1} max={16384} value={width} onChange={e=>{const next=Number(e.target.value);setWidth(next);setHeight(Math.max(1,Math.round(image.height*next/image.width)));setFactor(0);}}/>
     <span>×</span>
     <Input aria-label="Resize height" type="number" min={1} max={16384} value={height} onChange={e=>{const next=Number(e.target.value);setHeight(next);setWidth(Math.max(1,Math.round(image.width*next/image.height)));setFactor(0);}}/>
     <span>px</span>
     <Button className="editor-resize-apply" size="sm" disabled={busy||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>16384||height>16384||width*height>16777216} onClick={()=>{onResize(width,height);setOpen(false);}}>Resize</Button>
    </div>
   </section>}
  </div>
  <div ref={zoomHost} className="editor-zoom-controls"><Button ref={zoomTrigger} variant="plain" type="button" className="editor-status-cell editor-status-button editor-zoom-status" aria-label="Zoom controls" aria-expanded={zoomOpen} aria-controls="editor-zoom-popover" disabled={!image||busy} onClick={()=>{setOpen(false);setZoomOpen(value=>!value);}}><output aria-label="Zoom percentage">{Math.round(zoom*100)}%</output><small>Zoom</small></Button>
   {zoomOpen&&image&&<section id="editor-zoom-popover" className="editor-size-popover editor-zoom-popover" aria-label="Zoom controls"><div className="editor-zoom-slider"><div className="editor-zoom-track"><Button variant="plain" className="editor-fit-marker" aria-label="Fit" aria-description={`Fit image at ${Math.round(fitPercent*10)/10}%`} data-fit-percent={fitPercent} style={{left:`calc(${fitPosition*100}% + ${8-fitPosition*16}px)`}} disabled={busy} onClick={()=>{onFit();setZoomOpen(false);zoomTrigger.current?.focus();}}>Fit</Button><Slider aria-label="Image zoom" min={1} max={800} step={1} value={zoom*100} disabled={busy} onValueChange={value=>onZoom(value/100)}/></div><output aria-label="Selected zoom">{Math.round(zoom*100)}%</output></div></section>}
  </div>
 </div>;
}
