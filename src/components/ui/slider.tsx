import { forwardRef, useState, useRef, useImperativeHandle, useEffect, type InputHTMLAttributes, type CSSProperties } from "react";
import { cn } from "../../lib/utils";
import "./controls.css";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue"> {
  value?: number | string;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
}

/** Native keyboard, pointer and form behavior with a shared custom track/thumb. */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider({value, defaultValue=0, min=0, max=100, step=1, onValueChange, onChange, className, style, ...props}, ref) {
  const [uncontrolled,setUncontrolled]=useState(defaultValue);
  const element=useRef<HTMLInputElement>(null);
  useImperativeHandle(ref,()=>element.current!,[]);
  useEffect(()=>{const form=element.current?.form;if(!form||value!==undefined)return;const reset=()=>setUncontrolled(defaultValue);form.addEventListener("reset",reset);return()=>form.removeEventListener("reset",reset);},[value,defaultValue]);
  const start=Number(min),end=Number(max),current=Number(value??uncontrolled);
  const progress=Number.isFinite(current)&&end>start?Math.max(0,Math.min(100,(current-start)/(end-start)*100)):0;
  return <input {...props} ref={element} type="range" data-slot="slider" className={cn("ui-slider",className)} min={min} max={max} step={step} value={value??uncontrolled} style={{...style,"--slider-progress":`${progress}%`} as CSSProperties} onChange={event=>{
    if(event.currentTarget.matches(":disabled"))return;
    const next=event.currentTarget.valueAsNumber;
    if(!Number.isFinite(next))return;
    if(value===undefined)setUncontrolled(next);
    onValueChange?.(next);
    onChange?.(event);
  }}/>;
});
