import type { MagnifierEffect } from "./emphasis-renderer";
import type { Point } from "../../contracts/editor";
export const sourceRadii=(e:MagnifierEffect)=>({x:e.radius,y:e.radiusY??e.radius});
export const lensRadii=(e:MagnifierEffect)=>({x:e.radius*(e.sourceCenter?e.zoom:1),y:(e.radiusY??e.radius)*(e.sourceCenter?e.zoom:1)});
/** Gap is in document pixels, independent of ellipse size and magnification. */
export const MAGNIFIER_GAP=32;
export function initialMagnifierCenter(source:Point,radius:number,radiusY:number,zoom:number,width:number,height:number):Point {
 const rx=radius*zoom,ry=radiusY*zoom;
 const sides=[
  {space:width-source.x-radius,point:{x:source.x+radius+MAGNIFIER_GAP+rx,y:source.y}},
  {space:source.x-radius,point:{x:source.x-radius-MAGNIFIER_GAP-rx,y:source.y}},
  {space:height-source.y-radiusY,point:{x:source.x,y:source.y+radiusY+MAGNIFIER_GAP+ry}},
  {space:source.y-radiusY,point:{x:source.x,y:source.y-radiusY-MAGNIFIER_GAP-ry}}
 ];
 const fits=(p:Point)=>p.x-rx>=0&&p.y-ry>=0&&p.x+rx<=width&&p.y+ry<=height;
 const available=sides.filter(side=>fits(side.point));
 const choice=(available.length?available:sides).sort((a,b)=>b.space-a.space)[0].point;
 // A lens larger than all free regions may be clipped; keep a valid center.
 return {x:Math.max(0,Math.min(width,choice.x)),y:Math.max(0,Math.min(height,choice.y))};
}
/** Clip the connector to each ellipse; overlapping lenses need no internal line. */
export function magnifierConnector(e:MagnifierEffect):readonly [Point,Point]|null{
 if(!e.sourceCenter)return null;
 const a=e.sourceCenter,b=e.center,dx=b.x-a.x,dy=b.y-a.y,r=sourceRadii(e);
 const distance=Math.hypot(dx,dy);if(!distance)return null;
 const ux=dx/distance,uy=dy/distance,edge=1/Math.hypot(ux/r.x,uy/r.y);
 const lensEdge=edge*e.zoom;
 if(distance<=edge+lensEdge)return null;
 return [{x:a.x+ux*edge,y:a.y+uy*edge},{x:b.x-ux*lensEdge,y:b.y-uy*lensEdge}];
}
export function drawMagnifier(ctx:CanvasRenderingContext2D,source:CanvasImageSource,e:MagnifierEffect){
 const r=lensRadii(e),origin=sourceRadii(e),sample=e.sourceCenter??e.center,link=magnifierConnector(e);
 ctx.save();ctx.strokeStyle=e.borderColor;ctx.lineWidth=e.borderWidth;
 if(e.sourceCenter){ctx.beginPath();ctx.ellipse(sample.x,sample.y,origin.x,origin.y,0,0,Math.PI*2);ctx.stroke();}
 if(link){ctx.beginPath();ctx.moveTo(link[0].x,link[0].y);ctx.lineTo(link[1].x,link[1].y);ctx.stroke();}
 ctx.save();ctx.beginPath();ctx.ellipse(e.center.x,e.center.y,r.x,r.y,0,0,Math.PI*2);ctx.clip();
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage(source,sample.x-r.x/e.zoom,sample.y-r.y/e.zoom,2*r.x/e.zoom,2*r.y/e.zoom,e.center.x-r.x,e.center.y-r.y,2*r.x,2*r.y);ctx.restore();
 ctx.beginPath();ctx.ellipse(e.center.x,e.center.y,r.x,r.y,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
