import type {HTMLAttributes} from "react";
export type StatusTone="success"|"warning"|"error"|"info";
export function StatusMessage({tone="info",className="",children,...props}:HTMLAttributes<HTMLParagraphElement>&{tone?:StatusTone}){return <p {...props} role={tone==="error"?"alert":"status"} data-tone={tone} className={`ui-status ${className}`}>{children}</p>;}
export const uploadTone=(status:string):StatusTone=>status==="success"?"success":status==="failed"?"error":status==="pending"?"warning":"info";
