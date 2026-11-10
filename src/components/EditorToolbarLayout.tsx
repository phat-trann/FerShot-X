import { ToolHint } from "./ui/tool-hint";
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
 useLayoutEffect(()=>{const node=visible.current;if(!node)return;const measure=()=>{if(!context.orders.length)return;let used=0,count=0;for(const order of context.orders){const cost=(order>=10&&order<40?36:40)+(order===10?12:0);if(used+cost>node.clientWidth)break;used+=cost;count++;}context.setCapacity(count);};const observer=new ResizeObserver(measure);observer.observe(node);measure();return()=>observer.disconnect();},[context.setCapacity,context.orders]);
 const overflow=context.orders.length>context.capacity;
 return <div className="editor-tool-strip"><div ref={visible} className="editor-visible-tools">{children}</div><div className="editor-overflow-slot"><details className="editor-tool-overflow" hidden={!overflow}><ToolHint asChild label="More Tools"><summary aria-label="More tools"><Ellipsis size={16}/></summary></ToolHint><div ref={context.setHost} className="editor-overflow-menu" aria-label="Additional image tools"/></details></div></div>;
}
export function EditorTool({order,label,shortcut,children,hint=true}:{order:number;label:string;shortcut?:string;children:ReactElement;hint?:boolean}){
 const context=useContext(Context);const register=context?.register;
 useLayoutEffect(()=>register?.(order),[register,order]);
 if(!context)return children;
 const index=context.orders.indexOf(order),overflow=index>=context.capacity&&index>=0&&context.host;
 const child=children as ReactElement<{title?:string;className?:string;children?:ReactNode;onClick?:(event:MouseEvent)=>void}>;
 if(overflow)return createPortal(<div className="editor-overflow-row" style={{order}}>{cloneElement(child,{title:undefined,className:`${child.props.className??""} editor-overflow-tool`,onClick:(event:MouseEvent)=>{child.props.onClick?.(event);const details=context.host?.closest("details");if(details)details.open=false;},children:<>{child.props.children}<span>{label}</span>{shortcut&&<kbd>{shortcut}</kbd>}</>})}</div>,context.host!);
 return <span className={`editor-tool-slot${order<10?" editor-output-tool":""}${order===10?" editor-drawing-start":""}${index===Math.min(context.capacity,context.orders.length)-1?" editor-tool-last":""}`} style={{order}}>{hint?<ToolHint label={label} shortcut={shortcut}>{children}</ToolHint>:children}</span>;
}
