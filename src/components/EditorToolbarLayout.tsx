import { createContext,useCallback,useContext,useLayoutEffect,useMemo,useRef,useState,cloneElement,type ReactElement,type ReactNode,type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Ellipsis } from "lucide-react";

type Registry={orders:readonly number[];capacity:number;host:HTMLElement|null;register:(order:number)=>()=>void;setCapacity:(value:number)=>void;setHost:(host:HTMLDivElement|null)=>void};
const Context=createContext<Registry|null>(null);
export function EditorToolbarProvider({children}:{children:ReactNode}){
 const [orders,setOrders]=useState<readonly number[]>([]),[capacity,setCapacity]=useState(100),[host,setHost]=useState<HTMLDivElement|null>(null);
 const register=useCallback((order:number)=>{setOrders(old=>old.includes(order)?old:[...old,order].sort((a,b)=>a-b));return()=>setOrders(old=>old.filter(n=>n!==order));},[]);
 const value=useMemo(()=>({orders,capacity,host,register,setCapacity,setHost}),[orders,capacity,host,register]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function EditorToolStrip({children}:{children:ReactNode}){
 const context=useContext(Context)!,visible=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{const node=visible.current;if(!node)return;const measure=()=>context.setCapacity(Math.max(0,Math.floor(Math.max(0,node.clientWidth-12)/36)));const observer=new ResizeObserver(measure);observer.observe(node);measure();return()=>observer.disconnect();},[context.setCapacity]);
 const overflow=context.orders.length>context.capacity;
 return <div className="editor-tool-strip"><div ref={visible} className="editor-visible-tools">{children}</div><div className="editor-overflow-slot"><details className="editor-tool-overflow" hidden={!overflow}><summary aria-label="More tools" title="More Tools"><Ellipsis size={16}/></summary><div ref={context.setHost} className="editor-overflow-menu" aria-label="Additional image tools"/></details></div></div>;
}
export function EditorTool({order,label,children}:{order:number;label:string;children:ReactElement}){
 const context=useContext(Context);const register=context?.register;
 useLayoutEffect(()=>register?.(order),[register,order]);
 if(!context)return children;
 const index=context.orders.indexOf(order),overflow=index>=context.capacity&&index>=0&&context.host;
 const child=children as ReactElement<{className?:string;children?:ReactNode;onClick?:(event:MouseEvent)=>void}>;
 if(overflow)return createPortal(<div className="editor-overflow-row" style={{order}}>{cloneElement(child,{className:`${child.props.className??""} editor-overflow-tool`,onClick:(event:MouseEvent)=>{child.props.onClick?.(event);const details=context.host?.closest("details");if(details)details.open=false;},children:<>{child.props.children}<span>{label}</span></>})}</div>,context.host!);
 return <span className={`editor-tool-slot${order<10?" editor-output-tool":""}${order===10?" editor-drawing-start":""}${index===Math.min(context.capacity,context.orders.length)-1?" editor-tool-last":""}`} style={{order}}>{children}</span>;
}
