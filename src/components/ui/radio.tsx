import { forwardRef,type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import "./controls.css";

export const Radio=forwardRef<HTMLInputElement,Omit<InputHTMLAttributes<HTMLInputElement>,"type">>(function Radio({className,...props},ref){
  return <input {...props} ref={ref} type="radio" data-slot="radio" className={cn("ui-radio",className)}/>;
});
