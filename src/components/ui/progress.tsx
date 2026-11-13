import { forwardRef, type ProgressHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import "./controls.css";

/** Shared progress primitive: retains accessible value and indeterminate semantics. */
export const Progress = forwardRef<HTMLProgressElement, ProgressHTMLAttributes<HTMLProgressElement>>(function Progress({ className, ...props }, ref) {
  return <progress {...props} ref={ref} data-slot="progress" className={cn("ui-progress", className)} />;
});
