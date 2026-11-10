import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import "./controls.css";

/** Keep native selection, form submission and existing change-event contracts. */
export const NativeSelect=forwardRef<HTMLSelectElement,SelectHTMLAttributes<HTMLSelectElement>>(function NativeSelect({className,...props},ref){
  return <select {...props} ref={ref} data-slot="select" className={cn("ui-select",className)}/>;
});
