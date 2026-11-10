import {useLayoutEffect,useState,type ReactNode} from "react";import {createPortal} from "react-dom";
export function EditorChrome({children,target="editor-tool-options"}:{children:ReactNode;target?:string}){const [host,setHost]=useState<HTMLElement|null>(null);useLayoutEffect(()=>setHost(document.getElementById(target)),[target]);return host?createPortal(children,host):<>{children}</>;}
