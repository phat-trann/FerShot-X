import {useEffect} from "react";

/** Renderer chrome only; native traffic lights and window policy stay owned by macOS. */
export function useWindowAppearance(){
  useEffect(()=>{
    const root=document.documentElement;
    const set=(active:boolean)=>{root.dataset.windowActive=String(active);};
    const focus=()=>set(true),blur=()=>set(false),visibility=()=>set(!document.hidden&&document.hasFocus());
    visibility();window.addEventListener("focus",focus);window.addEventListener("blur",blur);document.addEventListener("visibilitychange",visibility);
    return()=>{window.removeEventListener("focus",focus);window.removeEventListener("blur",blur);document.removeEventListener("visibilitychange",visibility);delete root.dataset.windowActive;};
  },[]);
}
