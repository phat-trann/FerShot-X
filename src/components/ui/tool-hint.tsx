import {cloneElement,useId,useRef,useState,useEffect,useLayoutEffect,type ReactElement,type HTMLAttributes,type Ref} from "react";
import {createPortal} from "react-dom";

/** Immediate, keyboard-accessible tool hint; portalled beyond toolbar clipping. */
export function ToolHint({label,shortcut,children,asChild=false}:{label:string;shortcut?:string;children:ReactElement;asChild?:boolean}){
 const id=useId(),host=useRef<HTMLElement|null>(null),[position,setPosition]=useState<{x:number;y:number}|null>(null);
 const popupRef=useRef<HTMLSpanElement>(null);
 useLayoutEffect(()=>{const node=popupRef.current;if(node&&position){const scale=devicePixelRatio||1;node.style.left=`${Math.round((position.x-node.getBoundingClientRect().width/2)*scale)/scale}px`;node.style.transform="none";}},[position]);
 const show=()=>{const bounds=host.current?.getBoundingClientRect();if(bounds)setPosition({x:Math.max(90,Math.min(innerWidth-90,bounds.x+bounds.width/2)),y:bounds.bottom+8});};
 useEffect(()=>{if(!position)return;const close=()=>setPosition(null);window.addEventListener("resize",close);window.addEventListener("scroll",close,true);return()=>{window.removeEventListener("resize",close);window.removeEventListener("scroll",close,true);};},[position]);
 const keyHint=shortcut?.replace("⌘","Meta+").replace("⇧","Shift+").replace("⌫","Backspace");
 const child=children as ReactElement<HTMLAttributes<HTMLElement>&{ref?:Ref<HTMLElement>}>;
 const popup=position&&createPortal(<span ref={popupRef} id={id} role="tooltip" className="tool-hint" style={{left:position.x,top:position.y}}><span>{label}</span>{shortcut&&<kbd>({shortcut})</kbd>}</span>,document.body);
 if(asChild)return <>{cloneElement(child,{ref:node=>{host.current=node;const ref=child.props.ref;if(typeof ref==="function")ref(node);else if(ref)ref.current=node;},title:undefined,"aria-describedby":[child.props["aria-describedby"],position?id:undefined].filter(Boolean).join(" ")||undefined,"aria-keyshortcuts":keyHint??child.props["aria-keyshortcuts"],onMouseEnter:event=>{child.props.onMouseEnter?.(event);show();},onMouseLeave:event=>{child.props.onMouseLeave?.(event);setPosition(null);},onFocus:event=>{child.props.onFocus?.(event);show();},onBlur:event=>{child.props.onBlur?.(event);setPosition(null);},onPointerDown:event=>{child.props.onPointerDown?.(event);setPosition(null);},onKeyDown:event=>{child.props.onKeyDown?.(event);if(event.key==="Escape")setPosition(null);}})}{popup}</>;
 return <span className="tool-hint-host" ref={node=>{host.current=node;}} onMouseEnter={show} onMouseLeave={()=>setPosition(null)} onFocus={show} onBlur={()=>setPosition(null)} onPointerDown={()=>setPosition(null)} onKeyDown={event=>{if(event.key==="Escape")setPosition(null);}}>{cloneElement(child,{title:undefined,"aria-describedby":[child.props["aria-describedby"],position?id:undefined].filter(Boolean).join(" ")||undefined,"aria-keyshortcuts":keyHint??child.props["aria-keyshortcuts"]})}{popup}</span>;
}
