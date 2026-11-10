import { useEffect,useRef,useState } from "react";
import "./EditorImageStatus.css";
import { Button } from "./ui/button";
import type { ImageDocument } from "../contracts/media";
import { Input } from "./ui/input";

export function EditorImageStatus({image,color,zoom,busy,onFit,onCrop,onResize}:{image?:ImageDocument;color:string;zoom:number;busy:boolean;onFit:()=>void;onCrop:()=>void;onResize:(width:number,height:number)=>void}){
 const host=useRef<HTMLDivElement>(null);
 const [width,setWidth]=useState(image?.width??1),[height,setHeight]=useState(image?.height??1),[factor,setFactor]=useState(1),[open,setOpen]=useState(false);
 useEffect(()=>{setWidth(image?.width??1);setHeight(image?.height??1);setFactor(1);setOpen(false);},[image?.id,image?.width,image?.height]);
 useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!host.current?.contains(event.target))setOpen(false);};const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};},[open]);
 function preset(value:number){if(!image)return;setFactor(value);setWidth(Math.max(1,Math.round(image.width*value)));setHeight(Math.max(1,Math.round(image.height*value)));}
 return <div className="editor-status-strip">
  <div className="editor-status-cell editor-color-status" aria-label="Color under pointer"><span className="editor-color-swatch" style={{backgroundColor:color}}/><span><output aria-label="Pointer color">{color}</output><small>Tab to copy</small></span></div>
  <div ref={host} className="editor-image-status"><button type="button" className="editor-status-cell editor-status-button" aria-label="Image size" aria-expanded={open} disabled={!image||busy} onClick={()=>setOpen(value=>!value)}><span>{image?`${image.width}×${image.height}px`:"—"}</span><small>Image size</small></button>
   {open&&image&&<section className="editor-size-popover" aria-label="Resize and crop image"><strong>Resize Image <span>(can’t be undone!)</span></strong><div className="editor-size-presets">{([.25,.33,.5,1,2,4]as const).map(value=><Button key={value} variant={factor===value?"default":"ghost"} size="sm" aria-pressed={factor===value} onClick={()=>preset(value)}>{value<1?`${Math.round(value*100)}%`:`${value}×`}</Button>)}</div><div className="editor-size-fields"><Input aria-label="Resize width" type="number" min={1} max={16384} value={width} onChange={e=>{const next=Number(e.target.value);setWidth(next);setHeight(Math.max(1,Math.round(image.height*next/image.width)));setFactor(0);}}/><span>×</span><Input aria-label="Resize height" type="number" min={1} max={16384} value={height} onChange={e=>{const next=Number(e.target.value);setHeight(next);setWidth(Math.max(1,Math.round(image.width*next/image.height)));setFactor(0);}}/><span>px</span><Button size="sm" disabled={busy||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>16384||height>16384||width*height>16777216} onClick={()=>{onResize(width,height);setOpen(false);}}>Resize</Button></div><Button variant="ghost" size="sm" onClick={()=>{onCrop();setOpen(false);}}>Crop Region</Button><Button variant="ghost" size="sm" onClick={()=>setOpen(false)}>Cancel</Button></section>}
  </div>
  <button type="button" className="editor-status-cell editor-status-button editor-zoom-status" aria-label="Fit image" title="Fit Image" disabled={!image||busy} onClick={onFit}><output aria-label="Zoom percentage">{Math.round(zoom*100)}%</output><small>Zoom</small></button>
 </div>;
}
