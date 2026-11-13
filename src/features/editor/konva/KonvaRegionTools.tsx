import { Input } from "../../../components/ui/input";
import { useEffect,useLayoutEffect,useRef,useState } from "react";
import Konva from "konva";
import { Stage,Layer,Image as CanvasImage,Rect,Transformer } from "react-konva";
import { Blend,Grid2x2,Square,Eraser } from "lucide-react";
import { EditorChrome } from "../../../components/EditorChrome";
import { Toggle } from "../../../components/ui/toggle";
import type { ImageDocument } from "../../../contracts/media";
import type { Rect as Region,Point } from "../../../contracts/editor";
import { clampCropRect,fitAspectPreservingResize,type DirectTransformOptions } from "../../direct-manipulation";
import { buildPixelEffectRequest } from "../../direct-manipulation/DirectEffectsSurface";
import type { PixelEffectRequest } from "../../effects-panel";
import { Slider } from "../../../components/ui/slider";

export function KonvaRegionTools({image,mode,busy,zoom,onTransform,onEffect,onCancel}:{image:ImageDocument;mode:"crop"|"resize"|"effects";busy:boolean;zoom:number;onTransform:(options:DirectTransformOptions)=>void;onEffect:(effect:PixelEffectRequest)=>void;onCancel:()=>void}){
 const host=useRef<HTMLDivElement>(null),stage=useRef<Konva.Stage>(null),selection=useRef<Konva.Rect>(null),transformer=useRef<Konva.Transformer>(null);
 const [source,setSource]=useState<HTMLImageElement|null>(null),[region,setRegion]=useState<Region>({x:0,y:0,width:image.width,height:image.height}),[draft,setDraft]=useState(false),[kind,setKind]=useState<PixelEffectRequest["kind"]>("blur"),[amount,setAmount]=useState(8),[color,setColor]=useState("#000000"),[error,setError]=useState("");
 const gesture=useRef<{id:number;start:Point;left:number;top:number}|null>(null),dragging=useRef(false);
 useLayoutEffect(()=>{host.current?.focus({preventScroll:true});},[image.id,mode]);
 useEffect(()=>{let live=true;const source=new window.Image();source.src=image.src;void source.decode().then(()=>{if(live)setSource(source);}).catch(()=>{if(live)setError("The image preview could not be loaded.");});return()=>{live=false;};},[image.src]);
 useLayoutEffect(()=>{gesture.current=null;dragging.current=false;transformer.current?.nodes(selection.current&&(draft||mode==="resize")?[selection.current]:[]);},[draft,mode,zoom,region]);
 const point=()=>{const p=stage.current?.getPointerPosition();return p?{x:Math.max(0,Math.min(image.width,p.x/zoom)),y:Math.max(0,Math.min(image.height,p.y/zoom))}:null;};
 function finishRegion(){const node=selection.current;if(!node)return;const value=mode==="resize"?{x:0,y:0,...fitAspectPreservingResize(node.width()*node.scaleX(),node.height()*node.scaleY(),image.width,image.height)}:clampCropRect({x:node.x(),y:node.y(),width:node.width()*node.scaleX(),height:node.height()*node.scaleY()},image.width,image.height);node.scale({x:1,y:1});node.setAttrs(value);setRegion(value);setDraft(true);dragging.current=false;}
 function apply(){if(!draft||gesture.current||dragging.current||busy)return;try{if(mode==="effects")onEffect(buildPixelEffectRequest({kind,rect:region,imageWidth:image.width,imageHeight:image.height,radius:amount,blockSize:amount,colorHex:color,alpha:255}));else onTransform(mode==="crop"?{crop:region}:{resize:{width:region.width,height:region.height}});}catch(e){setError(e instanceof Error?e.message:"The region is invalid.");}}
 useEffect(()=>{const abort=()=>{gesture.current=null;dragging.current=false;selection.current?.setAttrs({...region,scaleX:1,scaleY:1});};window.addEventListener("blur",abort);window.addEventListener("resize",abort);window.addEventListener("scroll",abort,true);return()=>{window.removeEventListener("blur",abort);window.removeEventListener("resize",abort);window.removeEventListener("scroll",abort,true);};},[region]);
 return <section className="konva-region-tools" onKeyDown={e=>{if(e.target instanceof HTMLElement&&e.target.closest("input,textarea,select"))return;if(e.key==="Enter"&&!e.repeat){e.preventDefault();e.stopPropagation();apply();}if(e.key==="Escape"){e.preventDefault();gesture.current=null;onCancel();}}}>
  <EditorChrome target="editor-tool-options"><div className="konva-region-options"><output data-testid="direct-transform-readout">{mode} · {region.width} × {region.height} px</output>{mode==="effects"&&<>{([["blur",Blend],["mosaic",Grid2x2],["solidCover",Square],["transparentErase",Eraser]]as const).map(([value,Icon])=><Toggle key={value} size="sm" disabled={busy} pressed={kind===value} aria-label={value} onPressedChange={()=>setKind(value)}><Icon size={16}/></Toggle>)}{(kind==="blur"||kind==="mosaic")&&<Slider aria-label="Effect strength"  min={kind==="mosaic"?2:1} max={kind==="mosaic"?128:64} value={amount} onValueChange={sliderValue => setAmount(Number(sliderValue))}/ >}{kind==="solidCover"&&<Input aria-label="Cover color" type="color" value={color} onChange={e=>setColor(e.target.value)}/>}</>}{error&&<span role="alert">{error}</span>}</div></EditorChrome>
  <div ref={host} tabIndex={0} data-engine="react-konva" data-testid={mode==="effects"?"direct-effects-stage":"direct-transform-stage"} style={{width:image.width*zoom,height:image.height*zoom}}>
   <Stage ref={stage} width={image.width*zoom} height={image.height*zoom} scaleX={zoom} scaleY={zoom}
    onPointerDown={e=>{if(busy||gesture.current||e.evt.isPrimary===false||e.evt.button!==0)return;host.current?.focus({preventScroll:true});if(mode==="resize"||e.target!==stage.current)return;const p=point();if(!p)return;const bounds=stage.current!.container().getBoundingClientRect();gesture.current={id:e.evt.pointerId,start:p,left:bounds.left,top:bounds.top};(e.evt.target as HTMLElement)?.setPointerCapture?.(e.evt.pointerId);transformer.current?.nodes([]);}}
    onPointerMove={e=>{const g=gesture.current,p=point();if(!g||g.id!==e.evt.pointerId||!p)return;selection.current?.setAttrs({visible:true,x:Math.min(g.start.x,p.x),y:Math.min(g.start.y,p.y),width:Math.abs(g.start.x-p.x),height:Math.abs(g.start.y-p.y)});}}
    onPointerUp={e=>{const g=gesture.current;if(!g||g.id!==e.evt.pointerId)return;gesture.current=null;const bounds=stage.current!.container().getBoundingClientRect();if(bounds.left!==g.left||bounds.top!==g.top){selection.current?.setAttrs(region);return;}if((selection.current?.width()??0)>=1&&(selection.current?.height()??0)>=1)finishRegion();}}
    onPointerCancel={()=>{gesture.current=null;selection.current?.setAttrs(region);}}>
    <Layer listening={false}>{source&&<CanvasImage image={source} width={image.width} height={image.height}/>}</Layer>
    <Layer><Rect ref={selection} {...region} visible={draft||mode==="resize"} draggable={draft&&mode!=="resize"&&!busy} listening={(draft||mode==="resize")&&!busy} fill="rgba(20,126,251,.12)" stroke="#147efb" strokeWidth={1/zoom} onDragStart={()=>{dragging.current=true;}} onDragEnd={finishRegion} onTransformStart={()=>{dragging.current=true;}} onTransformEnd={finishRegion}/><Transformer ref={transformer} listening={!busy} enabledAnchors={["top-left","top-right","bottom-left","bottom-right"]} keepRatio={mode==="resize"} rotateEnabled={false} flipEnabled={false} anchorSize={8} anchorStroke="#147efb" borderStroke="#147efb" boundBoxFunc={(old,next)=>next.width<1||next.height<1?old:next}/></Layer>
   </Stage>
  </div>
 </section>;
}
