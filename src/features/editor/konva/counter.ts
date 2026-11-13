import type { Point, Rect } from "../../../contracts/editor";

export const DEFAULT_COUNTER_ANGLE=135;
export function counterTip(center:Point,radius:number,angle=DEFAULT_COUNTER_ANGLE):Point {
  const rad=angle*Math.PI/180;
  return {x:center.x+Math.cos(rad)*radius*1.35,y:center.y+Math.sin(rad)*radius*1.35};
}
export function counterBounds(center:Point,radius:number,angle=DEFAULT_COUNTER_ANGLE):Rect {
  const tip=counterTip(center,radius,angle),x=Math.min(center.x-radius,tip.x),y=Math.min(center.y-radius,tip.y);
  return {x,y,width:Math.max(center.x+radius,tip.x)-x,height:Math.max(center.y+radius,tip.y)-y};
}
export function counterCorner(center:Point,pointer:Point):number {
  const angle=Math.atan2(pointer.y-center.y,pointer.x-center.x)*180/Math.PI;
  return (angle%360+360)%360;
}
type PathContext=Pick<CanvasRenderingContext2D,"beginPath"|"moveTo"|"arc"|"quadraticCurveTo"|"closePath">;
/** Shared path for the live badge and exported pixels; the number never rotates. */
export function traceCounterBadge(ctx:PathContext,center:Point,radius:number,angle=DEFAULT_COUNTER_ANGLE){
  const a=angle*Math.PI/180,spread=.55,point=(t:number,r=radius)=>({x:center.x+Math.cos(t)*r,y:center.y+Math.sin(t)*r});
  const start=point(a+spread),tip=counterTip(center,radius,angle),first=point(a-spread/3),last=point(a+spread/3);
  ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.arc(center.x,center.y,radius,a+spread,a-spread+Math.PI*2);
  ctx.quadraticCurveTo(first.x,first.y,tip.x,tip.y);ctx.quadraticCurveTo(last.x,last.y,start.x,start.y);ctx.closePath();
}
