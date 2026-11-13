import type {ReactNode} from "react";
import {LoaderCircle,type LucideIcon} from "lucide-react";

export function EmptyState({icon:Icon,title,action}:{icon:LucideIcon;title:string;action?:ReactNode}){
  return <div className="ui-empty-state"><Icon size={36} strokeWidth={1.5} aria-hidden="true"/><p>{title}</p>{action}</div>;
}
export function LoadingState({children}:{children:ReactNode}){
  return <div className="ui-loading-state" role="status"><LoaderCircle size={18} strokeWidth={1.75} aria-hidden="true"/><span className="sr-only">{children}</span></div>;
}
