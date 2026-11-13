import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import "./controls.css";

export const Textarea=forwardRef<HTMLTextAreaElement,TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({className,...props},ref){
  return <textarea {...props} ref={ref} data-slot="textarea" className={cn("ui-input",className)}/>;
});
