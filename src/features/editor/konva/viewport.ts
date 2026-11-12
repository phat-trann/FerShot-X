import {useLayoutEffect,useState,type RefObject} from "react";
export function visibleCanvas(width:number,height:number,left:number,top:number,viewWidth:number,viewHeight:number){
 const x=Math.max(0,Math.min(width-1,Math.floor(left)-48)),y=Math.max(0,Math.min(height-1,Math.floor(top)-48));
 return {x,y,width:Math.max(1,Math.min(width-x,Math.ceil(viewWidth)+96)),height:Math.max(1,Math.min(height-y,Math.ceil(viewHeight)+96))};
}
export function useCanvasViewport(host:RefObject<HTMLDivElement|null>,width:number,height:number){
 const [view,setView]=useState(()=>visibleCanvas(width,height,0,0,innerWidth,innerHeight));
 useLayoutEffect(()=>{const node=host.current,scroller=node?.closest<HTMLElement>(".stage");if(!node||!scroller){setView({x:0,y:0,width,height});return;}
  let frame=0;const measure=()=>{cancelAnimationFrame(frame);frame=0;const box=node.getBoundingClientRect(),clip=scroller.getBoundingClientRect();const next=visibleCanvas(width,height,clip.left+scroller.clientLeft-box.left,clip.top+scroller.clientTop-box.top,scroller.clientWidth,scroller.clientHeight);setView(old=>Object.keys(next).every(key=>old[key as keyof typeof old]===next[key as keyof typeof next])?old:next);};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};const observer=new ResizeObserver(measure);observer.observe(scroller);scroller.addEventListener("scroll",schedule,{passive:true});window.addEventListener("fershot-editor-presented",measure);window.addEventListener("focus",measure);document.addEventListener("visibilitychange",measure);measure();return()=>{cancelAnimationFrame(frame);observer.disconnect();scroller.removeEventListener("scroll",schedule);window.removeEventListener("fershot-editor-presented",measure);window.removeEventListener("focus",measure);document.removeEventListener("visibilitychange",measure);};
 },[host,width,height]);
 return view;
}
