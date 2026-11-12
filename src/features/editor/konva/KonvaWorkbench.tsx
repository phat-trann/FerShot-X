import {useCanvasViewport} from "./viewport";
import { counterCorner,counterTip,traceCounterBadge,DEFAULT_COUNTER_ANGLE } from "./counter";
import { manipulationPolicy,lineEndpoints,editEndpoint } from "./manipulation";
import { EditorTool } from "../../../components/EditorToolbarLayout";
import { constrainGesture } from "./constrain";
import { createBlurPatch } from "./blur";
import { Fragment,memo,useMemo,useEffect,useLayoutEffect,useRef,useState } from "react";
import Konva from "konva";
import { Stage,Layer,Image as CanvasImage,Group,Rect,Ellipse,Line,Text,Circle,Shape,Transformer } from "react-konva";
import { MousePointer2,RectangleHorizontal,MoveUpRight,Pencil,Minus,Ellipse as EllipseIcon,Type,ListOrdered,Highlighter,Focus,ZoomIn,Blend,Undo2,Redo2,Trash2,RotateCw } from "lucide-react";
import { EditorChrome } from "../../../components/EditorChrome";
import { Toggle } from "../../../components/ui/toggle";
import { Button } from "../../../components/ui/button";
import type { Point } from "../../../contracts/editor";
import { validateAdvancedItem,type AdvancedEditorItem,type AdvancedWorkbenchProps,type AdvancedToolMode } from "../advanced-workbench";
import { computeArrowHeadVertices } from "../render";
import { mapItem,itemBounds } from "./model";
import { Slider } from "../../../components/ui/slider";
import { Input } from "../../../components/ui/input";

type Tool=Exclude<AdvancedToolMode,"workbench-base">;
const toolKeys:Record<string,string>={select:"v",rectangle:"r",arrow:"a",pen:"p",line:"l",ellipse:"o",text:"t",counter:"c",highlight:"h",spotlight:"s",magnifier:"m",blur:"b"};
const tools=[ ["select",MousePointer2],["rectangle",RectangleHorizontal],["arrow",MoveUpRight],["pen",Pencil],["line",Minus],["ellipse",EllipseIcon],["text",Type],["counter",ListOrdered],["highlight",Highlighter],["spotlight",Focus],["magnifier",ZoomIn],["blur",Blend] ] as const;
let lastStyle={color:"#ef4444",stroke:3};
const lastSizes={font:18,counter:24,border:3};
const lastEffects={highlight:.3,spotlight:.6,blur:8,magnifier:2};
const editable=(target:EventTarget|null)=>target instanceof HTMLElement&&!!target.closest("input,textarea,select,[contenteditable=true]");

function BlurArtwork({item,image}:{item:Extract<AdvancedEditorItem,{itemKind:"contract"}>;image:HTMLImageElement|null}){const b=itemBounds(item);const patch=useMemo(()=>image?createBlurPatch(image,b,item.annotation.blurRadius??8):null,[image,b.x,b.y,b.width,b.height,item.annotation.blurRadius]);return patch?<CanvasImage name="sampled-effect" image={patch} {...b}/>:null;}
function InsertedArtwork({item}:{item:Extract<AdvancedEditorItem,{itemKind:"image"}>}){const [image,setImage]=useState<HTMLImageElement|null>(null);useEffect(()=>{let alive=true;const image=new window.Image();image.onload=()=>{if(alive)setImage(image);};image.src=item.src;return()=>{alive=false;};},[item.src]);return image?<CanvasImage image={image} {...item.rect}/>:null;}
const toolName=(value:string)=>value==="pen"?"Freehand":value==="select"?"Select":value[0].toUpperCase()+value.slice(1);
const Artwork=memo(function Artwork({item,image,width,height,zoom,counterAngle}:{item:AdvancedEditorItem;image:HTMLImageElement|null;width:number;height:number;zoom:number;counterAngle?:number}) {
  if(item.itemKind==="image")return <InsertedArtwork item={item}/>;
  if(item.itemKind==="emphasis"){
    const e=item.effect;
    if(e.kind==="highlight")return <Rect {...e.rect} fill={e.color} opacity={e.opacity}/>;
    if(e.kind==="spotlight"){const r=e.cutoutRect;return <Group><Rect x={r.x} y={r.y} width={r.width} height={r.height} fill="transparent"/><Shape listening={false} sceneFunc={ctx=>{ctx.save();const cx=r.x+r.width/2,cy=r.y+r.height/2,angle=item.rotation??0;if(angle){ctx.translate(cx,cy);ctx.rotate(-angle*Math.PI/180);ctx.translate(-cx,-cy);}const hole=new Path2D();hole.rect(r.x,r.y,r.width,r.height);const mask=new Path2D();mask.rect(0,0,width,height);mask.addPath(hole,new DOMMatrix().translate(cx,cy).rotate(angle).translate(-cx,-cy));ctx._context.fillStyle=`rgba(0,0,0,${e.dimOpacity})`;ctx._context.fill(mask,"evenodd");ctx.restore();}}/></Group>;}
    const r=e.radius/e.zoom;
    return <Group><Group clipFunc={ctx=>{ctx.arc(e.center.x,e.center.y,e.radius,0,Math.PI*2);}}>{image&&<CanvasImage name="sampled-effect" image={image} x={e.center.x-e.radius} y={e.center.y-e.radius} width={e.radius*2} height={e.radius*2} crop={{x:e.center.x-r,y:e.center.y-r,width:r*2,height:r*2}}/>}</Group><Circle x={e.center.x} y={e.center.y} radius={e.radius} stroke={e.borderColor} strokeWidth={e.borderWidth} strokeScaleEnabled={true}/></Group>;
  }
  if(item.itemKind==="contract"&&item.annotation.tool==="blur")return <BlurArtwork item={item} image={image}/>;
  const a=item.itemKind==="contract"?item.annotation:item.shape;
  const kind="tool"in a?a.tool:a.kind, p=a.points[0],q=a.points[a.points.length-1]??p;
  const style={stroke:a.style.color,strokeWidth:a.style.strokeWidth,opacity:a.style.opacity,lineCap:"round" as const,lineJoin:"round" as const,perfectDrawEnabled:false,strokeScaleEnabled:true};
  const rect={x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),width:Math.abs(q.x-p.x),height:Math.abs(q.y-p.y)};
  if(kind==="rectangle")return <Rect {...rect} {...style}/>;
  if(kind==="ellipse")return <Ellipse x={rect.x+rect.width/2} y={rect.y+rect.height/2} radiusX={rect.width/2} radiusY={rect.height/2} {...style}/>;
  if(kind==="text"){const text="text"in a?a.text??"Text":"Text";return <Text x={p.x} y={p.y} text={text} scaleX={item.geometryScale?.x??1} scaleY={item.geometryScale?.y??1} fill={a.style.color} fontSize={Math.max(14,a.style.strokeWidth*6)} fontStyle="bold" fontFamily="sans-serif" opacity={a.style.opacity}/>;}
  if(kind==="counter"){const radius=Math.max(12,a.style.strokeWidth*4);return <Group x={p.x} y={p.y} scaleX={item.geometryScale?.x??1} scaleY={item.geometryScale?.y??1} opacity={a.style.opacity}><Shape name="counter-badge" fill={a.style.color} sceneFunc={(ctx,shape)=>{traceCounterBadge(ctx,{x:0,y:0},radius,counterAngle??("counterAngle"in a?a.counterAngle:undefined));ctx.fillStrokeShape(shape);}}/><Text x={-radius} y={-radius} width={2*radius} height={2*radius} verticalAlign="middle" align="center" text={String("counter"in a?a.counter??1:1)} fill="#fff" fontSize={radius} fontStyle="bold" fontFamily="sans-serif"/></Group>;}
  const head=kind==="arrow"?computeArrowHeadVertices(p,q,a.style.strokeWidth):null;
  const points=head?[p.x,p.y,(head[1].x+head[2].x)/2,(head[1].y+head[2].y)/2]:a.points.flatMap(p=>[p.x,p.y]);
  return <Group><Line name="editable-line" points={points} hitStrokeWidth={Math.max(12/zoom,a.style.strokeWidth)} {...style} lineCap={head?"butt":"round"}/>{head&&<Line name="editable-arrowhead" points={head.flatMap(p=>[p.x,p.y])} closed fill={a.style.color} opacity={a.style.opacity} strokeEnabled={false}/>}</Group>;
});

/** During pointer motion Konva updates only a transient node, never React's document/history. */
export function KonvaWorkbench({onSourceReady,onSourceError,onPixelSample,imageToInsert,onImageInserted,imageId,imageSrc,imageWidth:width,imageHeight:height,zoom=1,initialItems=[],busy,disabled,onToolChange,onSnapshotChange}:AdvancedWorkbenchProps&{onSourceReady?:()=>void;onSourceError?:()=>void;onPixelSample?:(hex:string)=>void;imageToInsert?:{id:string;src:string;width:number;height:number};onImageInserted?:()=>void}){
  const [items,setItems]=useState<readonly AdvancedEditorItem[]>(initialItems),[selected,setSelected]=useState<string|null>(null),[tool,setTool]=useState<Tool>("select"),[color,setColor]=useState(lastStyle.color),[stroke,setStroke]=useState(lastStyle.stroke),[text,setText]=useState("Text"),[loadedSource,setSource]=useState<HTMLImageElement|null>(null),[revision,setRevision]=useState(0);
  const [draggingElement,setDraggingElement]=useState(false);
  const [hovered,setHovered]=useState<string|null>(null),[counterAngleDraft,setCounterAngleDraft]=useState<number|null>(null);
  const counterGesture=useRef<{pointerId:number;item:AdvancedEditorItem;start:Point;moved:boolean;angle:number}|null>(null);
  const stage=useRef<Konva.Stage>(null),transformer=useRef<Konva.Transformer>(null),preview=useRef<Konva.Shape>(null),host=useRef<HTMLDivElement>(null),nodes=useRef(new Map<string,Konva.Group>());
  const endpointDrag=useRef<{item:AdvancedEditorItem;index:0|1}|null>(null),endpointNodes=useRef<Array<Konva.Circle|null>>([]);
  const history=useRef<{past:(readonly AdvancedEditorItem[])[];future:(readonly AdvancedEditorItem[])[]}>({past:[],future:[]});
  const current=useRef(items);current.current=items;
  const manipulation=useRef<{node:Konva.Group;x:number;y:number;rotation:number;sx:number;sy:number}|null>(null);
  const gesture=useRef<{tool:Tool;points:Point[];pointerId:number;zoom:number;left:number;top:number;hadSelection:boolean}|null>(null);
  const blocked=!!busy||!!disabled,scale=Number.isFinite(zoom)&&zoom>0?zoom:1;
  const source=loadedSource?.src===imageSrc?loadedSource:null;
  const viewport=useCanvasViewport(host,width*scale,height*scale);
  const emitted=useRef(items);
  const callback=useRef(onSnapshotChange);callback.current=onSnapshotChange;
  const readyCallback=useRef(onSourceReady),errorCallback=useRef(onSourceError);readyCallback.current=onSourceReady;errorCallback.current=onSourceError;
  useLayoutEffect(()=>{
    let live=true;
    setSource(null);
    if(!imageSrc)return;
    const img=new window.Image();
    const apply=()=>{
      if(!live)return;
      setSource(img);
      stage.current?.batchDraw();
    };
    img.onerror=()=>{if(live)errorCallback.current?.();};
    img.onload=apply;
    img.src=imageSrc;
    if(img.complete&&img.naturalWidth>0){
      apply();
    }else if(typeof img.decode==="function"){
      img.decode().then(apply).catch(()=>{});
    }
    return()=>{live=false;};
  },[imageSrc]);
  useLayoutEffect(()=>{
    if(!source)return;
    // Hidden WKWebViews may suspend animation frames: draw the committed image
    // synchronously before asking native code to bring this document forward.
    stage.current?.draw();readyCallback.current?.();
  },[source,width,height,scale]);
  useEffect(()=>{
    let suspended=false,frame=0,second=0;const timers=new Set<ReturnType<typeof setTimeout>>();
    const cancel=()=>{cancelAnimationFrame(frame);cancelAnimationFrame(second);for(const timer of timers)clearTimeout(timer);timers.clear();};
    const draw=(reset=false)=>{if(suspended||document.hidden)return;const node=stage.current;if(!node)return;if(reset)for(const layer of node.getLayers())layer.getCanvas().setSize(node.width(),node.height());node.draw();};
    const clear=()=>{suspended=true;cancel();if(host.current)host.current.style.visibility="hidden";for(const layer of stage.current?.getLayers()??[])layer.getCanvas().getContext().clear();};
    const repaint=()=>{if(suspended||document.hidden)return;cancel();draw(true);frame=requestAnimationFrame(()=>{draw();second=requestAnimationFrame(()=>draw());});for(const delay of [50,150,400]){const timer=setTimeout(()=>{timers.delete(timer);draw();},delay);timers.add(timer);}};
    // Native presentation can resize/discard WKWebView backing stores after the
    // first focus/animation frame. Recreate and draw only bounded visible canvases.
    const presented=()=>{suspended=false;if(host.current)host.current.style.visibility="visible";repaint();};window.addEventListener("fershot-capture-starting",clear);window.addEventListener("fershot-editor-presented",presented);window.addEventListener("focus",repaint);document.addEventListener("visibilitychange",repaint);
    return()=>{cancel();window.removeEventListener("fershot-capture-starting",clear);window.removeEventListener("fershot-editor-presented",presented);window.removeEventListener("focus",repaint);document.removeEventListener("visibilitychange",repaint);};
  },[]);
  useEffect(()=>{if(items===emitted.current)return;emitted.current=items;callback.current?.({items,selectedId:selected});},[items]);
  useEffect(()=>{if(blocked){cancelManipulation();cancelEndpoint();gesture.current=null;preview.current?.setAttr("draft",null);}},[blocked]);
  useEffect(()=>{const abort=()=>{counterGesture.current=null;setCounterAngleDraft(null);cancelManipulation();cancelEndpoint();gesture.current=null;preview.current?.setAttr("draft",null);};window.addEventListener("blur",abort);window.addEventListener("resize",abort);window.addEventListener("scroll",abort,true);return()=>{window.removeEventListener("blur",abort);window.removeEventListener("resize",abort);window.removeEventListener("scroll",abort,true);};},[]);
  useLayoutEffect(()=>{cancelEndpoint();gesture.current=null;preview.current?.setAttr("draft",null);transformer.current?.nodes(!blocked&&tool!=="pen"&&selected&&nodes.current.has(selected)&&items.find(item=>item.id===selected)&&manipulationPolicy(items.find(item=>item.id===selected)!).anchors.length?[nodes.current.get(selected)!]:[]);},[selected,items,scale,tool,blocked]);
  function beginManipulation(node:Konva.Group){if(manipulation.current?.node===node)return;setHovered(null);cancelManipulation();setDraggingElement(true);manipulation.current={node,x:node.x(),y:node.y(),rotation:node.rotation(),sx:node.scaleX(),sy:node.scaleY()};node.findOne(".sampled-effect")?.visible(false);node.getLayer()?.batchDraw();}
  function endManipulation(node:Konva.Group){if(manipulation.current?.node!==node)return false;manipulation.current=null;setDraggingElement(false);node.findOne(".sampled-effect")?.visible(true);return true;}
  function cancelManipulation(){const active=manipulation.current;if(!active)return;manipulation.current=null;setDraggingElement(false);active.node.stopDrag();transformer.current?.stopTransform();active.node.position({x:active.x,y:active.y});active.node.scale({x:active.sx,y:active.sy});active.node.rotation(active.rotation);active.node.findOne(".sampled-effect")?.visible(true);active.node.getLayer()?.batchDraw();}
  useLayoutEffect(()=>{stage.current?.draw();},[tool,selected,items,source,scale,viewport.x,viewport.y,viewport.width,viewport.height]);
  useEffect(()=>{const outside=(event:PointerEvent)=>{const target=event.target;if(blocked||tool==="pen"||!(target instanceof HTMLElement)||host.current?.contains(target)||target.closest(".editor-chrome,.editor-overflow-menu,button,input,select,textarea,[role=dialog]"))return;cancelManipulation();cancelEndpoint();gesture.current=null;preview.current?.setAttr("draft",null);setTool("select");setSelected(null);setHovered(null);};document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside);},[blocked,tool]);
  function commit(next:readonly AdvancedEditorItem[]){if(next.length>1024)return;history.current.past.push(current.current);if(history.current.past.length>64)history.current.past.shift();history.current.future=[];current.current=next;setItems(next);setRevision(n=>n+1);}
  useLayoutEffect(()=>{counterGesture.current=null;setCounterAngleDraft(null);cancelManipulation();},[scale,blocked]);
  const lastInsertion=useRef<string|null>(null);
  useEffect(()=>{if(!imageToInsert||lastInsertion.current===imageToInsert.id)return;lastInsertion.current=imageToInsert.id;const ratio=Math.min(1,width*.8/imageToInsert.width,height*.8/imageToInsert.height),w=imageToInsert.width*ratio,h=imageToInsert.height*ratio;const item:AdvancedEditorItem={id:imageToInsert.id,itemKind:"image",src:imageToInsert.src,rect:{x:(width-w)/2,y:(height-h)/2,width:w,height:h}};validateAdvancedItem(item,width,height);commit([...current.current,item]);setSelected(item.id);setTool("select");onImageInserted?.();},[imageToInsert]);
  function undo(redo=false){cancelManipulation();const from=redo?history.current.future:history.current.past,to=redo?history.current.past:history.current.future;const next=from.pop();if(next){to.push(current.current);current.current=next;setItems(next);setSelected(null);setRevision(n=>n+1);}}
  function point():Point|null{const p=stage.current?.getPointerPosition();return p?{x:Math.max(0,Math.min(width,(p.x+viewport.x)/scale)),y:Math.max(0,Math.min(height,(p.y+viewport.y)/scale))}:null;}
  const sampleFrame=useRef(0),sampleCallback=useRef(onPixelSample);sampleCallback.current=onPixelSample;
  useEffect(()=>()=>cancelAnimationFrame(sampleFrame.current),[]);
  function samplePixel(){if(sampleFrame.current||!sampleCallback.current)return;sampleFrame.current=requestAnimationFrame(()=>{sampleFrame.current=0;const pointer=stage.current?.getPointerPosition(),node=host.current;if(!pointer||!node)return;let r=0,g=0,b=0,a=0;for(const canvas of node.querySelectorAll<HTMLCanvasElement>(".konvajs-content > canvas:not([data-editor-overlay])")){const bounds={width:stage.current!.width(),height:stage.current!.height()};if(pointer.x<0||pointer.y<0||pointer.x>=bounds.width||pointer.y>=bounds.height)continue;const context=canvas.getContext("2d");if(!context)continue;const pixel=context.getImageData(Math.floor(pointer.x*canvas.width/bounds.width),Math.floor(pointer.y*canvas.height/bounds.height),1,1).data,alpha=pixel[3]/255,next=alpha+a*(1-alpha);if(next){r=(pixel[0]*alpha+r*a*(1-alpha))/next;g=(pixel[1]*alpha+g*a*(1-alpha))/next;b=(pixel[2]*alpha+b*a*(1-alpha))/next;}a=next;}sampleCallback.current?.("#"+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,"0")).join("").toUpperCase());});}
  function lineGraphic(item:AdvancedEditorItem){const group=nodes.current.get(item.id);if(!group)return;const a=item.itemKind==="contract"?item.annotation:item.itemKind==="shape"?item.shape:null;if(!a)return;const arrow=("tool"in a?a.tool:a.kind)==="arrow",head=arrow?computeArrowHeadVertices(a.points[0],a.points[a.points.length-1],a.style.strokeWidth):null;group.rotation(item.rotation??0);group.position(group.offset());group.findOne<Konva.Line>(".editable-line")?.points(head?[a.points[0].x,a.points[0].y,(head[1].x+head[2].x)/2,(head[1].y+head[2].y)/2]:a.points.flatMap(p=>[p.x,p.y]));if(head)group.findOne<Konva.Line>(".editable-arrowhead")?.points(head.flatMap(p=>[p.x,p.y]));group.getLayer()?.batchDraw();}
  function cancelEndpoint(){const active=endpointDrag.current;if(!active)return;endpointDrag.current=null;lineGraphic(active.item);const points=lineEndpoints(active.item);endpointNodes.current.forEach((node,index)=>{node?.stopDrag();if(node&&points)node.position(points[index]);});}
  function dragEndpoint(node:Konva.Circle,shift:boolean,finish=false){const active=endpointDrag.current;if(!active||blocked)return;const next=editEndpoint(active.item,active.index,node.position(),width,height,shift);if(!next){if(finish)cancelEndpoint();return;}const points=lineEndpoints(next)!;node.position(points[active.index]);lineGraphic(next);if(finish){endpointDrag.current=null;commit(current.current.map(item=>item.id===next.id?next:item));}}
  function selectTool(value:Tool){counterGesture.current=null;setCounterAngleDraft(null);setHovered(null);cancelManipulation();cancelEndpoint();if(value!=="select")setSelected(null);if(value!=="select"){setColor(lastStyle.color);setStroke(value==="text"?lastSizes.font/6:value==="counter"?lastSizes.counter/8:value==="magnifier"?lastSizes.border:lastStyle.stroke);}gesture.current=null;preview.current?.setAttr("draft",null);setTool(value);onToolChange?.();}
  function create(points:Point[],mode:Tool):AdvancedEditorItem|null{
    const p=points[0],q=points[points.length-1],id=crypto.randomUUID(),style={color,strokeWidth:stroke,opacity:1};
    const rect={x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),width:Math.abs(q.x-p.x),height:Math.abs(q.y-p.y)};
    if(mode==="blur"&&rect.width*rect.height>4194304)return null;
    if(["rectangle","ellipse","highlight","spotlight","blur"].includes(mode)&&(rect.width<1||rect.height<1))return null;
    if(["line","arrow"].includes(mode)&&Math.hypot(q.x-p.x,q.y-p.y)<1)return null;
    if(mode==="highlight"||mode==="spotlight")return {id,itemKind:"emphasis",effect:mode==="highlight"?{id,kind:mode,rect,color,opacity:lastEffects.highlight}:{id,kind:mode,cutoutRect:rect,dimOpacity:lastEffects.spotlight}};
    if(mode==="magnifier")return {id,itemKind:"emphasis",effect:{id,kind:mode,center:q,radius:Math.min(512,Math.max(4,Math.hypot(q.x-p.x,q.y-p.y))),zoom:lastEffects.magnifier,borderColor:color,borderWidth:Math.min(16,stroke)}};
    if(mode==="line")return {id,itemKind:"shape",shape:{id,kind:mode,points:[p,q],style}};
    if(mode==="select")return null;
    return {id,itemKind:"contract",annotation:{id,tool:mode,points:mode==="text"||mode==="counter"?[p]:mode==="pen"?points:[p,q],style,...(mode==="blur"?{blurRadius:lastEffects.blur}:{}),...(mode==="text"?{text}:mode==="counter"?{counter:items.filter(i=>i.itemKind==="contract"&&i.annotation.tool==="counter").length+1,counterAngle:DEFAULT_COUNTER_ANGLE}:{})}};
  }
  function finish(e:Konva.KonvaEventObject<PointerEvent>){
    const active=gesture.current;if(!active||active.pointerId!==e.evt.pointerId)return;
    gesture.current=null;preview.current?.setAttr("draft",null);
    if(blocked||active.zoom!==scale)return;
    const bounds=stage.current?.container().getBoundingClientRect();if(!bounds||bounds.left!==active.left||bounds.top!==active.top)return;
    const raw=point();if(!raw)return;
    const click=Math.hypot(raw.x-active.points[0].x,raw.y-active.points[0].y)*scale<3;
    if(click&&!["counter","text","pen"].includes(active.tool)){setTool("select");setSelected(null);setHovered(null);return;}
    if(click&&active.tool==="pen")return;
    const end=constrainGesture(active.points[0],raw,active.tool,e.evt.shiftKey,width,height);
    const points=active.tool==="pen"?(e.evt.shiftKey?[active.points[0],end]:[...active.points,end]):[active.points[0],end];
    const item=create(points,active.tool);if(item){try{validateAdvancedItem(item,width,height);commit([...current.current,item]);setSelected(item.id);}catch{/* Degenerate gestures leave history unchanged. */}}
  }
  function changeStyle(nextColor:string,nextStroke:number,resizeFixed=false){const selectedItem=current.current.find(item=>item.id===selected);lastStyle.color=nextColor;if(selectedItem?.itemKind==="contract"&&selectedItem.annotation.tool==="text")lastSizes.font=Math.max(14,nextStroke*6);else if(selectedItem?.itemKind==="contract"&&selectedItem.annotation.tool==="counter")lastSizes.counter=Math.max(24,nextStroke*8);else if(selectedItem?.itemKind==="emphasis"&&selectedItem.effect.kind==="magnifier")lastSizes.border=Math.min(16,nextStroke);else lastStyle.stroke=nextStroke;setColor(nextColor);setStroke(nextStroke);if(!selected)return;commit(current.current.map(item=>{if(item.id!==selected)return item;if(item.itemKind==="contract")return {...item,...(resizeFixed&&["text","counter"].includes(item.annotation.tool)?{geometryScale:undefined}:{}),annotation:{...item.annotation,style:{...item.annotation.style,color:nextColor,strokeWidth:nextStroke}}};if(item.itemKind==="shape")return {...item,shape:{...item.shape,style:{...item.shape.style,color:nextColor,strokeWidth:nextStroke}}};if(item.itemKind==="image")return item;const e=item.effect;return {...item,effect:e.kind==="highlight"?{...e,color:nextColor}:e.kind==="magnifier"?{...e,borderColor:nextColor,borderWidth:Math.min(16,nextStroke)}:e};}));}
  function changeEffect(value:number){const chosen=current.current.find(item=>item.id===selected);if(chosen?.itemKind==="contract"&&chosen.annotation.tool==="blur")lastEffects.blur=value;else if(chosen?.itemKind==="emphasis")lastEffects[chosen.effect.kind]=value;commit(current.current.map(item=>{if(item.id!==selected)return item;if(item.itemKind==="contract"&&item.annotation.tool==="blur")return {...item,annotation:{...item.annotation,blurRadius:value}};if(item.itemKind!=="emphasis")return item;const e=item.effect;return {...item,effect:e.kind==="highlight"?{...e,opacity:value}:e.kind==="spotlight"?{...e,dimOpacity:value}:{...e,zoom:value}};}));}

  function changeText(value:string){setText(value);const item=current.current.find(i=>i.id===selected);if(item?.itemKind==="contract"&&item.annotation.tool==="text")commit(current.current.map(i=>i===item?{...i,annotation:{...i.annotation,text:value||"Text"}}:i));}
  const chosen=items.find(item=>item.id===selected);
  const policy=chosen?manipulationPolicy(chosen):null;
  const endpoints=chosen&&policy?.kind==="endpoints"?lineEndpoints(chosen):null;
  const counterItem=chosen?.itemKind==="contract"&&chosen.annotation.tool==="counter"?chosen:null;
  const counterAngle=counterAngleDraft??counterItem?.annotation.counterAngle??DEFAULT_COUNTER_ANGLE;
  const counterHandle=counterItem?counterTip(counterItem.annotation.points[0],Math.max(12,counterItem.annotation.style.strokeWidth*4)+12/scale,counterAngle):null;
  function commitCounterAngle(item:AdvancedEditorItem,angle:number){if(item.itemKind!=="contract")return;const next={...item,annotation:{...item.annotation,counterAngle:angle}};validateAdvancedItem(next,width,height);commit(current.current.map(old=>old.id===item.id?next:old));}
  const hasColor=!!chosen&&chosen.itemKind!=="image"&&(chosen.itemKind==="contract"?chosen.annotation.tool!=="blur":chosen.itemKind!=="emphasis"||chosen.effect.kind!=="spotlight");
  const hasSize=!!chosen&&chosen.itemKind!=="image"&&(chosen.itemKind==="contract"?chosen.annotation.tool!=="blur":chosen.itemKind!=="emphasis"||chosen.effect.kind==="magnifier");
  const sizeControl=chosen?.itemKind==="contract"&&chosen.annotation.tool==="text"?{label:"Font Size",value:Math.max(14,stroke*6),min:14,max:192,divisor:6}:chosen?.itemKind==="contract"&&chosen.annotation.tool==="counter"?{label:"Counter Size",value:Math.max(24,stroke*8),min:24,max:256,divisor:8}:chosen?.itemKind==="emphasis"&&chosen.effect.kind==="magnifier"?{label:"Border Width",value:stroke,min:1,max:16,divisor:1}:{label:"Stroke Width",value:stroke,min:1,max:64,divisor:1};
  const effectControl=chosen?.itemKind==="contract"&&chosen.annotation.tool==="blur"?{label:"Blur Strength",min:1,max:64,step:1,value:chosen.annotation.blurRadius??8}:chosen?.itemKind==="emphasis"?chosen.effect.kind==="highlight"?{label:"Highlight Opacity",min:.05,max:.9,step:.05,value:chosen.effect.opacity}:chosen.effect.kind==="spotlight"?{label:"Dimming",min:.1,max:.95,step:.05,value:chosen.effect.dimOpacity}:{label:"Magnification",min:1.25,max:8,step:.25,value:chosen.effect.zoom}:null;
  useEffect(()=>{if(!chosen)return;const style=chosen.itemKind==="contract"?chosen.annotation.style:chosen.itemKind==="shape"?chosen.shape.style:null;const e=chosen.itemKind==="emphasis"?chosen.effect:null;const c=style?.color??(e?.kind==="highlight"?e.color:e?.kind==="magnifier"?e.borderColor:undefined);const n=style?.strokeWidth??(e?.kind==="magnifier"?e.borderWidth:undefined);if(c)setColor(c);if(n)setStroke(n);if(chosen.itemKind==="contract"&&chosen.annotation.tool==="text")setText(chosen.annotation.text??"Text");},[chosen]);
  useEffect(()=>{const keydown=(e:KeyboardEvent)=>{if(blocked||editable(e.target)||host.current?.closest("[hidden]")||document.querySelector('[aria-modal="true"],.editor-add-menu'))return;if(e.key==="Escape"){if(!counterGesture.current&&!manipulation.current&&!endpointDrag.current&&!gesture.current)return;e.preventDefault();counterGesture.current=null;setCounterAngleDraft(null);cancelManipulation();cancelEndpoint();setTool("select");gesture.current=null;preview.current?.setAttr("draft",null);setSelected(null);return;}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="z"){e.preventDefault();undo(e.shiftKey);return;}if(e.metaKey||e.ctrlKey||e.altKey)return;const keys=Object.fromEntries(Object.entries(toolKeys).map(([tool,key])=>[key,tool])) as Record<string,Tool>;if(keys[e.key.toLowerCase()]){e.preventDefault();selectTool(keys[e.key.toLowerCase()]);}if((e.key==="Backspace"||e.key==="Delete")&&selected){e.preventDefault();commit(items.filter(i=>i.id!==selected));setSelected(null);}};document.addEventListener("keydown",keydown,true);return()=>document.removeEventListener("keydown",keydown,true);});
  return <section className="fershot-advanced-workbench" data-engine="react-konva" data-image-id={imageId} data-revision={revision} data-active-tool={tool} data-hovered-element={hovered??undefined}>
    <EditorChrome target="editor-annotation-tools"><div className="konva-toolbar" role="group" aria-label="Drawing tools">{tools.map(([value,Icon],index)=><Fragment key={value}><EditorTool order={10+index} label={toolName(value)} shortcut={toolKeys[value].toUpperCase()}><Toggle size="sm" disabled={busy} pressed={tool===value&&!disabled} aria-label={`${value} tool`} title={toolName(value)} onPressedChange={()=>selectTool(value)}><Icon size={16}/></Toggle></EditorTool></Fragment>)}<EditorTool order={30} label="Undo" shortcut="⌘Z"><Button variant="ghost" size="icon" disabled={blocked||!history.current.past.length} aria-label="Undo" title="Undo" onClick={()=>undo()}><Undo2/></Button></EditorTool><EditorTool order={31} label="Redo" shortcut="⌘⇧Z"><Button variant="ghost" size="icon" disabled={blocked||!history.current.future.length} aria-label="Redo" title="Redo" onClick={()=>undo(true)}><Redo2/></Button></EditorTool><EditorTool order={32} label="Delete Selected Element" shortcut="⌫"><Button variant="ghost" size="icon" disabled={blocked||!selected} aria-label="Delete selected annotation" title="Delete Selected Element" onClick={()=>{commit(items.filter(i=>i.id!==selected));setSelected(null);}}><Trash2/></Button></EditorTool><output className="sr-only" aria-label="Advanced item count">{items.length} items</output><output className="sr-only" aria-label="Selection manipulation">{policy?.kind==="endpoints"?"Two endpoints and line movement":policy?.kind==="move"?(chosen?.itemKind==="contract"&&chosen.annotation.tool==="pen"?"Move only":"Move only; use properties for size"):policy?.kind==="uniform"?(tool==="pen"?"Drawing only; Select to move or resize":"Four corners; proportional resize and movement"):policy?.kind==="box"?"Eight handles and center movement":"No selection"}</output></div></EditorChrome>
    {chosen&&!disabled&&<EditorChrome target="editor-element-options"><div role="group" aria-label="Selected element properties" className="konva-element-properties">{hasColor&&<label>Color<input type="color" aria-label="Element color" disabled={busy} value={color} onChange={e=>changeStyle(e.target.value,stroke)}/></label>}{hasSize&&<label>{sizeControl.label}<Slider  aria-label="Element size" disabled={busy} min={sizeControl.min} max={sizeControl.max} value={sizeControl.value} onValueChange={sliderValue => changeStyle(color,Number(sliderValue)/sizeControl.divisor,true)}/><output>{Math.round(sizeControl.value)}px</output></label>}{effectControl&&<label>{effectControl.label}<Slider  aria-label={effectControl.label} disabled={busy} min={effectControl.min} max={effectControl.max} step={effectControl.step} value={effectControl.value} onValueChange={sliderValue => changeEffect(Number(sliderValue))}/><output>{chosen.itemKind==="emphasis"?chosen.effect.kind==="magnifier"?`${effectControl.value}×`:`${Math.round(effectControl.value*100)}%`:`${effectControl.value}px`}</output></label>}{chosen.itemKind==="contract"&&chosen.annotation.tool==="text"&&<Input aria-label="Annotation text" disabled={busy} maxLength={1000} value={text} onChange={e=>changeText(e.target.value)}/>}</div></EditorChrome>}
    <div ref={host} className="fershot-advanced-workbench__stage" data-testid="advanced-workbench-stage" tabIndex={0} style={{width:width*scale,height:height*scale,position:"relative",cursor:busy||!source?"wait":disabled?"default":draggingElement?"grabbing":hovered?"grab":tool==="select"?"default":tool==="text"?"text":tool==="counter"?"copy":tool==="magnifier"?"zoom-in":"crosshair"}}>
      <div style={{position:"absolute",left:viewport.x,top:viewport.y}}>
      <Stage ref={stage} width={viewport.width} height={viewport.height} scaleX={scale} scaleY={scale} offsetX={viewport.x/scale} offsetY={viewport.y/scale}
        onPointerDown={e=>{
          if(blocked||gesture.current||e.evt.isPrimary===false||e.evt.button!==0)return;
          host.current?.focus({preventScroll:true});
          const target=e.target;
          const parent=target.getParent();
          const isTransformer=parent?.getClassName()==="Transformer"||target.getClassName()==="Transformer"||target.name()==="endpoint-handle"||(typeof target.name==="function"&&target.name()?.includes("anchor"))||(parent&&parent instanceof Konva.Transformer);
          if(isTransformer)return;
          if(selected&&tool!=="pen"){const selectedNode=nodes.current.get(selected);if(selectedNode&&((target as unknown)===selectedNode||(target.getAncestors() as unknown as Konva.Node[]).includes(selectedNode))){return;}}
          if(tool==="select"){if(e.target===stage.current)setSelected(null);return;}
          const p=point();if(!p)return;
          const bounds=stage.current!.container().getBoundingClientRect();
          gesture.current={tool,points:[p],pointerId:e.evt.pointerId,zoom:scale,left:bounds.left,top:bounds.top,hadSelection:!!selected};
          (e.evt.target as HTMLElement)?.setPointerCapture?.(e.evt.pointerId);
        }}
        onPointerMove={e=>{samplePixel();const active=gesture.current;if(!active||active.pointerId!==e.evt.pointerId)return;const raw=point();if(!raw)return;const p=constrainGesture(active.points[0],raw,active.tool,e.evt.shiftKey,width,height);if(active.tool==="pen"&&active.points.length<2048)active.points.push(p);preview.current?.setAttr("draft",{tool:active.tool,points:active.tool==="pen"&&!e.evt.shiftKey?active.points:[active.points[0],p],color,stroke,text});preview.current?.getLayer()?.batchDraw();}}
        onPointerUp={finish} onPointerCancel={()=>{cancelManipulation();cancelEndpoint();gesture.current=null;preview.current?.setAttr("draft",null);}}>
        <Layer listening={false}>{source&&<CanvasImage image={source} width={width} height={height}/>}</Layer>
        <Layer>{items.map(item=>{const bounds=itemBounds(item),cx=bounds.x+bounds.width/2,cy=bounds.y+bounds.height/2;return <Group key={item.id} x={cx} y={cy} offsetX={cx} offsetY={cy} rotation={item.rotation??0} ref={node=>{if(node)nodes.current.set(item.id,node);else nodes.current.delete(item.id);}} draggable={!blocked&&tool!=="pen"&&(tool==="select"||item.id===selected)} listening={!blocked&&tool!=="pen"&&(tool==="select"||item.id===selected)} onMouseEnter={()=>{if(!blocked&&(tool==="select"||item.id===selected))setHovered(item.id);}} onMouseLeave={()=>setHovered(old=>old===item.id?null:old)} onClick={e=>{e.cancelBubble=true;setSelected(item.id);if(item.itemKind==="contract"&&item.annotation.tool==="text")setText(item.annotation.text??"Text");}} onDragStart={e=>{setSelected(item.id);beginManipulation(e.currentTarget as Konva.Group);}} onTransformStart={e=>{beginManipulation(e.currentTarget as Konva.Group);}} onDragEnd={e=>{if(!endManipulation(e.currentTarget as Konva.Group))return;const node=e.target,dx=node.x()-cx,dy=node.y()-cy;node.position({x:cx,y:cy});commit(current.current.map(i=>i.id===item.id?mapItem(i,p=>({x:p.x+dx,y:p.y+dy})):i));}} onTransformEnd={e=>{if(!endManipulation(e.currentTarget as Konva.Group)||!manipulationPolicy(item).anchors.length)return;const node=e.target,sx=node.scaleX(),sy=node.scaleY(),x=node.x(),y=node.y(),rotation=node.rotation();node.scale({x:1,y:1});node.position({x:cx,y:cy});const next={...mapItem(item,p=>({x:(p.x-cx)*sx+x,y:(p.y-cy)*sy+y}),Math.sqrt(sx*sy)),rotation:((rotation%360)+360)%360,...(item.itemKind==="contract"&&["text","counter"].includes(item.annotation.tool)?{geometryScale:{x:Math.max(.01,Math.min(100,(item.geometryScale?.x??1)*sx)),y:Math.max(.01,Math.min(100,(item.geometryScale?.y??1)*sy))}}:{})};try{validateAdvancedItem(next,width,height);commit(items.map(i=>i.id===item.id?next:i));}catch{setRevision(n=>n+1);}}}>{manipulationPolicy(item).kind!=="endpoints"&&<Rect {...bounds} fill="rgba(0,0,0,0)"/>}<Artwork item={item} image={source} width={width} height={height} zoom={scale} counterAngle={item.id===selected?counterAngleDraft??undefined:undefined}/></Group>;})}<Transformer ref={transformer} listening={!blocked&&tool!=="pen"&&(tool==="select"||Boolean(selected))} rotateEnabled={false} keepRatio={policy?.keepRatio??false} ignoreStroke={true} flipEnabled={false} enabledAnchors={tool==="pen"?[]:policy?.anchors??[]} borderStroke="#147efb" anchorStroke="#147efb" anchorSize={7} boundBoxFunc={(old,next)=>next.width<2||next.height<2?old:next}/>{chosen&&policy?.kind==="move"&&<Rect {...itemBounds(chosen)} stroke="#147efb" strokeWidth={1/scale} dash={[4/scale,3/scale]} listening={false}/>}{chosen&&endpoints&&!blocked&&tool!=="pen"&&endpoints.map((point,index)=><Circle key={index} ref={node=>{endpointNodes.current[index]=node;}} name="endpoint-handle" onMouseEnter={()=>{if(host.current)host.current.style.cursor="move";}} onMouseLeave={()=>{if(host.current)host.current.style.cursor=tool==="select"?"default":"crosshair";}} listening={!blocked&&(tool==="select"||Boolean(selected))} x={point.x} y={point.y} radius={4.5/scale} fill="#fff" stroke="#147efb" strokeWidth={1/scale} draggable onPointerDown={e=>{e.cancelBubble=true;}} onDragStart={e=>{e.cancelBubble=true;endpointDrag.current={item:chosen,index:index as 0|1};}} onDragMove={e=>{e.cancelBubble=true;dragEndpoint(e.target as Konva.Circle,!!e.evt?.shiftKey);}} onDragEnd={e=>{e.cancelBubble=true;dragEndpoint(e.target as Konva.Circle,!!e.evt?.shiftKey,true);}}/>)}</Layer>
        <Layer listening={false} ref={node=>{if(node)node.getCanvas()._canvas.dataset.editorOverlay="true";}}>{hovered&&tool==="select"&&items.filter(item=>item.id===hovered).map(item=><Rect key={item.id} {...itemBounds(item)} fill="rgba(37,126,254,.08)" stroke="#257EFE" strokeWidth={1.5/scale} cornerRadius={2/scale}/>)}</Layer>
        <Layer listening={false}><Shape ref={preview} sceneFunc={(ctx,shape)=>{const d=shape.getAttr("draft")as {tool:Tool;points:Point[];color:string;stroke:number;text:string}|null;if(!d)return;const a=d.points[0],b=d.points[d.points.length-1],x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y);ctx.save();ctx.strokeStyle=d.color;ctx.fillStyle=d.color;ctx.lineWidth=d.stroke;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();if(d.tool==="ellipse")ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);else if(d.tool==="magnifier")ctx.arc(b.x,b.y,Math.max(4,Math.hypot(b.x-a.x,b.y-a.y)),0,Math.PI*2);else if(d.tool==="line"||d.tool==="arrow"||d.tool==="pen"){ctx.moveTo(a.x,a.y);if(d.tool==="arrow"){const [,left,right]=computeArrowHeadVertices(a,b,d.stroke);ctx.lineCap="butt";ctx.lineTo((left.x+right.x)/2,(left.y+right.y)/2);}else d.points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));}else if(d.tool==="text"){ctx.font=`bold ${Math.max(14,d.stroke*6)}px sans-serif`;ctx.textBaseline="top";ctx.fillText(d.text,a.x,a.y);}else if(d.tool==="counter"){traceCounterBadge(ctx,a,Math.max(12,d.stroke*4));ctx.fill();}else ctx.rect(x,y,w,h);if(d.tool==="highlight"){ctx.globalAlpha=.3;ctx.fill();}else ctx.stroke();if(d.tool==="arrow"){const [tip,left,right]=computeArrowHeadVertices(a,b,d.stroke);ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(left.x,left.y);ctx.lineTo(right.x,right.y);ctx.closePath();ctx.fill();}ctx.restore();}}/></Layer>
      </Stage></div>
      {counterItem&&counterHandle&&!blocked&&<button type="button" className="counter-corner-handle" aria-label="Rotate counter corner" title="Rotate Counter Corner" style={{left:counterHandle.x*scale,top:counterHandle.y*scale}} onPointerDown={event=>{event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);counterGesture.current={pointerId:event.pointerId,item:counterItem,start:{x:event.clientX,y:event.clientY},moved:false,angle:counterAngle};}} onPointerMove={event=>{const active=counterGesture.current,box=host.current?.getBoundingClientRect();if(!active||active.pointerId!==event.pointerId||!box||active.item.itemKind!=="contract")return;if(Math.hypot(event.clientX-active.start.x,event.clientY-active.start.y)<3&&!active.moved)return;active.moved=true;active.angle=counterCorner(active.item.annotation.points[0],{x:(event.clientX-box.left)/scale,y:(event.clientY-box.top)/scale});setCounterAngleDraft(active.angle);}} onPointerUp={event=>{const active=counterGesture.current;if(!active||active.pointerId!==event.pointerId)return;counterGesture.current=null;setCounterAngleDraft(null);commitCounterAngle(active.item,active.moved?active.angle:(active.angle+90)%360);}} onPointerCancel={()=>{counterGesture.current=null;setCounterAngleDraft(null);}} onLostPointerCapture={()=>{counterGesture.current=null;setCounterAngleDraft(null);}} onClick={event=>{if(event.detail===0)commitCounterAngle(counterItem,(counterAngle+90)%360);}} onKeyDown={event=>{if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)){event.preventDefault();commitCounterAngle(counterItem,(counterAngle+(["ArrowLeft","ArrowUp"].includes(event.key)?270:90))%360);}}}><RotateCw size={12}/></button>}

    </div>
  </section>;
}
