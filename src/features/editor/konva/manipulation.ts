import type { Point } from "../../../contracts/editor";
import type { AdvancedEditorItem } from "../advanced-workbench";
import { itemBounds } from "./model";
import { constrainGesture } from "./constrain";

export const BOX_ANCHORS=["top-left","top-center","top-right","middle-left","middle-right","bottom-left","bottom-center","bottom-right"];
export const CORNER_ANCHORS=["top-left","top-right","bottom-left","bottom-right"];
export function manipulationPolicy(item:AdvancedEditorItem){
 if(item.itemKind==="image")return {kind:"uniform" as const,anchors:CORNER_ANCHORS,keepRatio:true};
 const kind=item.itemKind==="contract"?item.annotation.tool:item.itemKind==="shape"?item.shape.kind:item.effect.kind;
 if(kind==="line"||kind==="arrow")return {kind:"endpoints" as const,anchors:[],keepRatio:false};
 if(kind==="text"||kind==="counter")return {kind:"move" as const,anchors:[],keepRatio:false};
 if(kind==="pen")return {kind:"uniform" as const,anchors:CORNER_ANCHORS,keepRatio:true};
 return {kind:"box" as const,anchors:BOX_ANCHORS,keepRatio:false};
}
/** Endpoint editing bakes legacy line rotation into coordinates without moving the other end. */
export function lineEndpoints(item:AdvancedEditorItem):readonly [Point,Point]|null{
 if(manipulationPolicy(item).kind!=="endpoints")return null;
 const points=item.itemKind==="contract"?item.annotation.points:item.itemKind==="shape"?item.shape.points:null;
 if(!points||points.length<2)return null;
 if(!item.rotation)return [points[0],points[points.length-1]];
 const b=itemBounds(item),cx=b.x+b.width/2,cy=b.y+b.height/2,angle=(item.rotation??0)*Math.PI/180;
 const rotate=(p:Point)=>({x:cx+(p.x-cx)*Math.cos(angle)-(p.y-cy)*Math.sin(angle),y:cy+(p.x-cx)*Math.sin(angle)+(p.y-cy)*Math.cos(angle)});
 return [rotate(points[0]),rotate(points[points.length-1])];
}
export function editEndpoint(item:AdvancedEditorItem,index:0|1,point:Point,width:number,height:number,shift=false):AdvancedEditorItem|null{
 const points=lineEndpoints(item);if(!points||![point.x,point.y].every(Number.isFinite))return null;
 const end=constrainGesture(points[index===0?1:0],{x:Math.max(0,Math.min(width,point.x)),y:Math.max(0,Math.min(height,point.y))},"line",shift,width,height);
 const next:[Point,Point]=index===0?[end,points[1]]:[points[0],end];if(Math.hypot(next[1].x-next[0].x,next[1].y-next[0].y)<1)return null;
 if(item.itemKind==="contract")return {...item,rotation:0,annotation:{...item.annotation,points:next}};
 if(item.itemKind==="shape")return {...item,rotation:0,shape:{...item.shape,points:next}};
 return null;
}
