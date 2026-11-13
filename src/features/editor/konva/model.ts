import { counterBounds } from "./counter";
import type { Point, Rect } from "../../../contracts/editor";
import type { AdvancedEditorItem } from "../advanced-workbench";

/** Map document geometry without flattening editable vectors into the bitmap. */
export function mapItem(item: AdvancedEditorItem, map: (p: Point) => Point, scale = 1): AdvancedEditorItem {
  if(item.itemKind==="image"){const a=map(item.rect),b=map({x:item.rect.x+item.rect.width,y:item.rect.y+item.rect.height});return {...item,rect:{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.max(1,Math.abs(b.x-a.x)),height:Math.max(1,Math.abs(b.y-a.y))}};}
  if (item.itemKind === "contract") return {...item, annotation: {...item.annotation, points: item.annotation.points.map(map), style: {...item.annotation.style, strokeWidth: Math.max(1,Math.min(64,item.annotation.style.strokeWidth*1))}}};
  if (item.itemKind === "shape") return {...item, shape: {...item.shape, points: item.shape.points.map(map) as [Point,Point], style: {...item.shape.style, strokeWidth: Math.max(1,Math.min(64,item.shape.style.strokeWidth*1))}}};
  const e=item.effect;
  const rect=(r:Rect):Rect=>{const a=map(r),b=map({x:r.x+r.width,y:r.y+r.height});return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.max(1,Math.abs(b.x-a.x)),height:Math.max(1,Math.abs(b.y-a.y))};};
  return {...item,effect:e.kind==="highlight"?{...e,rect:rect(e.rect)}:e.kind==="spotlight"?{...e,cutoutRect:rect(e.cutoutRect)}:{...e,center:map(e.center),...(e.sourceCenter?{sourceCenter:map(e.sourceCenter)}:{}),...(e.radiusY!==undefined?{radiusY:Math.max(4,Math.min(512,e.radiusY*scale))}:{}),radius:Math.max(4,Math.min(512,e.radius*scale))}};
}
export function itemBounds(item:AdvancedEditorItem):Rect {
  if(item.itemKind==="image")return item.rect;
  if(item.itemKind==="emphasis"){const e=item.effect;return e.kind==="highlight"?e.rect:e.kind==="spotlight"?e.cutoutRect:{x:(e.sourceCenter??e.center).x-e.radius,y:(e.sourceCenter??e.center).y-(e.radiusY??e.radius),width:2*e.radius,height:2*(e.radiusY??e.radius)};}
  if(item.itemKind==="contract"&&["text","counter"].includes(item.annotation.tool)){const a=item.annotation,p=a.points[0],gx=item.geometryScale?.x??1,gy=item.geometryScale?.y??1;if(a.tool==="counter"){const r=Math.max(12,a.style.strokeWidth*4);const b=counterBounds(p,r,a.counterAngle);return {x:p.x+(b.x-p.x)*gx,y:p.y+(b.y-p.y)*gy,width:b.width*gx,height:b.height*gy};}const font=Math.max(14,a.style.strokeWidth*6);return {x:p.x,y:p.y,width:Math.max(1,Math.max(...(a.text??"").split("\n").map(line=>line.length))*font*.6*gx),height:font*(a.text??"").split("\n").length*gy};}
  const a=item.itemKind==="contract"?item.annotation:item.shape, points=a.points;
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(1,Math.max(...xs)-Math.min(...xs)),height:Math.max(1,Math.max(...ys)-Math.min(...ys))};
}
