import {useLayoutEffect,useRef} from "react";
import type {ImageDocument} from "../contracts/media";

/** A window-local camera; it never changes the cached image or its editable draft. */
export function LibraryImagePreview({image,name}:{image:ImageDocument;name:string}){
 const viewport=useRef<HTMLDivElement>(null),artwork=useRef<HTMLImageElement>(null);
 useLayoutEffect(()=>{
  const host=viewport.current,node=artwork.current;if(!host||!node)return;
  let camera={x:0,y:0,scale:1},fit=1,frame=0,lastPanAt=-Infinity,pinch:{scale:number;x:number;y:number}|null=null;
  let pointer:{x:number;y:number}|null=null;
  const draw=()=>{frame=0;node.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`;};
  const paint=()=>{if(!frame)frame=requestAnimationFrame(draw);};
  const reset=()=>{cancelAnimationFrame(frame);frame=0;if(host.clientWidth<=0||host.clientHeight<=0)return;fit=Math.min(1,host.clientWidth/image.width,host.clientHeight/image.height);camera={scale:fit,x:(host.clientWidth-image.width*fit)/2,y:(host.clientHeight-image.height*fit)/2};draw();};
  const point=(x?:number,y?:number)=>{const box=host.getBoundingClientRect();return {x:Math.max(0,Math.min(box.width,(x??pointer?.x??box.left+box.width/2)-box.left)),y:Math.max(0,Math.min(box.height,(y??pointer?.y??box.top+box.height/2)-box.top))};};
  const zoom=(value:number,p=point())=>{const scale=Math.max(Math.min(.05,fit),Math.min(8,value));if(!Number.isFinite(scale)||scale===camera.scale)return;const ratio=scale/camera.scale;camera={scale,x:p.x-(p.x-camera.x)*ratio,y:p.y-(p.y-camera.y)*ratio};paint();};
  const move=(event:MouseEvent)=>{pointer={x:event.clientX,y:event.clientY};};
  const wheel=(event:WheelEvent)=>{
   if(document.hidden||document.querySelector('[aria-modal="true"]')||(!event.deltaX&&!event.deltaY))return;
   event.preventDefault();
   const modified=event.ctrlKey||event.metaKey,now=performance.now(),legacy=(event as WheelEvent&{wheelDeltaY?:number}).wheelDeltaY;
   // Match Edit: continuous two-finger movement pans; pinch/Cmd-wheel and notched wheels zoom.
   const continuous=event.deltaMode===0&&(Math.abs(event.deltaX)>0||event.deltaY%1!==0||Math.abs(event.deltaY)<15||(typeof legacy==="number"&&Math.abs(legacy)===Math.abs(event.deltaY)*3));
   if(!modified&&event.deltaMode===0&&(continuous||now-lastPanAt<300)){
    lastPanAt=now;const keepX=Math.min(32,image.width*camera.scale,host.clientWidth),keepY=Math.min(32,image.height*camera.scale,host.clientHeight);
    camera={...camera,x:Math.max(keepX-image.width*camera.scale,Math.min(host.clientWidth-keepX,camera.x-event.deltaX)),y:Math.max(keepY-image.height*camera.scale,Math.min(host.clientHeight-keepY,camera.y-event.deltaY))};paint();return;
   }
   if(pinch)return;
   const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?host.clientHeight:1);
   zoom(camera.scale*Math.exp(-Math.max(-240,Math.min(240,delta))*(event.ctrlKey?.01:.002)),point(event.clientX,event.clientY));
  };
  const gestureStart=(event:Event)=>{if(document.hidden||document.querySelector('[aria-modal="true"]'))return;event.preventDefault();const e=event as Event&{clientX?:number;clientY?:number};pinch={scale:camera.scale,...point(e.clientX,e.clientY)};};
  const gestureChange=(event:Event)=>{if(!pinch)return;event.preventDefault();const value=(event as Event&{scale:number}).scale;if(Number.isFinite(value)&&value>0)zoom(pinch.scale*value,pinch);};
  const gestureEnd=()=>{pinch=null;};
  const keydown=(event:KeyboardEvent)=>{if(event.metaKey||event.ctrlKey||event.altKey)return;if(["+","=","-","0"].includes(event.key)){event.preventDefault();if(event.key==="0")reset();else zoom(camera.scale*(event.key==="-"?1/1.2:1.2));}};
  const observer=new ResizeObserver(reset);observer.observe(host);reset();
  host.addEventListener("mousemove",move);host.addEventListener("wheel",wheel,{passive:false});host.addEventListener("gesturestart",gestureStart,{passive:false});host.addEventListener("gesturechange",gestureChange,{passive:false});host.addEventListener("gestureend",gestureEnd);host.addEventListener("keydown",keydown);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();host.removeEventListener("mousemove",move);host.removeEventListener("wheel",wheel);host.removeEventListener("gesturestart",gestureStart);host.removeEventListener("gesturechange",gestureChange);host.removeEventListener("gestureend",gestureEnd);host.removeEventListener("keydown",keydown);};
 },[image.src,image.width,image.height]);
 return <div ref={viewport} className="library-image-preview" role="region" aria-label="Image preview zoom" aria-keyshortcuts="+ - 0" tabIndex={0}><img ref={artwork} src={image.src} alt={name} width={image.width} height={image.height} draggable={false}/></div>;
}
