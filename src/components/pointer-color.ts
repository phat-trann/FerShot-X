/** High-frequency sampling updates the color cell, never the document workspace. */
export function createPointerColor(){
 let color="#ECECEC";const listeners=new Set<()=>void>();
 return {getSnapshot:()=>color,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},set:(value:string)=>{if(value===color)return;color=value;listeners.forEach(listener=>listener());}};
}
export type PointerColor=ReturnType<typeof createPointerColor>;
