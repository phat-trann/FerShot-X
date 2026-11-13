import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
import "./controls.css";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>,"type"> { onCheckedChange?:(checked:boolean)=>void }
/** Shared checkbox semantics for selection and settings. */
export const Checkbox=forwardRef<HTMLInputElement,CheckboxProps>(function Checkbox({className,onCheckedChange,onChange,...props},ref){
  return <span className="ui-checkbox-shell"><input {...props} type="checkbox" ref={ref} data-slot="checkbox" className={cn("ui-checkbox",className)} onChange={event=>{if(event.currentTarget.matches(":disabled"))return;onCheckedChange?.(event.currentTarget.checked);onChange?.(event);}}/><Check aria-hidden="true" className="ui-checkbox-mark" size={12} strokeWidth={2}/></span>;
});
