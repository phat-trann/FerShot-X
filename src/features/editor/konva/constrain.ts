import type { Point } from "../../../contracts/editor";
/** Shift constrains box tools to squares and line tools to 45-degree directions. */
export function constrainGesture(start:Point,end:Point,tool:string,shift:boolean,width:number,height:number):Point{
 if(!shift)return end;
 const dx=end.x-start.x,dy=end.y-start.y;
 if(["rectangle","ellipse","highlight","spotlight","blur"].includes(tool)){
  const sx=dx<0?-1:1,sy=dy<0?-1:1;
  const size=Math.min(Math.max(Math.abs(dx),Math.abs(dy)),sx<0?start.x:width-start.x,sy<0?start.y:height-start.y);
  return {x:start.x+sx*size,y:start.y+sy*size};
 }
 if(["line","arrow","pen"].includes(tool)){
  const angle=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4),ux=Math.cos(angle),uy=Math.sin(angle);
  let length=Math.hypot(dx,dy);
  if(Math.abs(ux)>1e-9)length=Math.min(length,(ux<0?start.x:width-start.x)/Math.abs(ux));
  if(Math.abs(uy)>1e-9)length=Math.min(length,(uy<0?start.y:height-start.y)/Math.abs(uy));
  return {x:start.x+ux*length,y:start.y+uy*length};
 }
 return end;
}
