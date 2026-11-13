import { forwardRef, useId, type ComponentPropsWithoutRef, type HTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Switch } from "./switch";
import { Checkbox, type CheckboxProps } from "./checkbox";
import "./controls.css";

export const FieldGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function FieldGroup({ className, ...props }, ref) {
  return <div {...props} ref={ref} data-slot="field-group" className={cn("ui-field-group", className)} />;
});
export const FieldLabel = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(function FieldLabel({ className, ...props }, ref) {
  return <label {...props} ref={ref} data-slot="field-label" className={cn("ui-field-label", className)} />;
});
export const FieldDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(function FieldDescription({ className, ...props }, ref) {
  return <p {...props} ref={ref} data-slot="field-description" className={cn("ui-field-description", className)} />;
});

/** All settings switches use the same label-first DOM and visual order. */
export const SwitchField = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof Switch> & { label: ReactNode }>(function SwitchField({ label, className, ...props }, ref) {
  return <FieldLabel className={cn("ui-switch-field", className)}><span>{label}</span><Switch {...props} ref={ref} /></FieldLabel>;
});

/** Settings checkboxes precede their linked labels; actions stay outside the label. */
export const CheckboxField=forwardRef<HTMLInputElement,CheckboxProps&{label:ReactNode;action?:ReactNode}>(function CheckboxField({label,action,className,id,...props},ref){
 const generated=useId(),inputId=id??generated;
 return <div className={cn("ui-checkbox-field",className)}><span className="ui-checkbox-field-control"><Checkbox {...props} id={inputId} ref={ref}/></span><span className="ui-checkbox-field-label"><label htmlFor={inputId}>{label}</label>{action}</span></div>;
});
