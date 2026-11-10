// Radix behavior with the shared FerShot X visual tokens.
import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "../../lib/utils";
import "./controls.css";

const Switch=React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>,React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>>(({className,...props},ref)=>(
  <SwitchPrimitives.Root {...props} ref={ref} data-slot="switch" className={cn("ui-switch",className)}>
    <SwitchPrimitives.Thumb className="ui-switch-thumb"/>
  </SwitchPrimitives.Root>
));
Switch.displayName="Switch";
export { Switch };
