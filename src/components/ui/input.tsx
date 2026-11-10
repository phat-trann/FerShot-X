import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import "./controls.css";

export const Input=forwardRef<HTMLInputElement,InputHTMLAttributes<HTMLInputElement>>(function Input({className,type="text",...props},ref){
  return <input {...props} type={type} ref={ref} data-slot="input" className={cn("ui-input",className)}/>;
});
