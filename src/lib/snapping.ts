export interface SnapPoint {key:string;value:number;label:string}
/** A spatial latch, not a timed/blocking pause. Release farther than capture to
 * prevent jitter while allowing a deliberate drag past an alignment. */
export function magneticSnap(value:number,points:readonly SnapPoint[],capture:number,release:number,held?:SnapPoint|null):{value:number;target:SnapPoint|null}{
 if(held&&points.some(p=>p.key===held.key&&p.value===held.value)&&Math.abs(value-held.value)<=release)return {value:held.value,target:held};
 let nearest:SnapPoint|null=null,distance=capture;
 for(const point of points){const d=Math.abs(value-point.value);if(d<=distance&&(d<distance||!nearest)){nearest=point;distance=d;}}
 return {value:nearest?.value??value,target:nearest};
}
export interface AlignmentRect {id:string;x:number;y:number;width:number;height:number;label:string;canvas?:boolean}
interface AlignmentPoint extends SnapPoint {axis:"x"|"y";line:number;target:AlignmentRect;movingAnchor:number}
export interface AlignmentGuide {axis:"x"|"y";value:number;from:number;to:number;label:string;target:AlignmentRect}
export interface AlignmentSession {bounds:AlignmentRect;x:AlignmentPoint[];y:AlignmentPoint[];heldX:AlignmentPoint|null;heldY:AlignmentPoint|null}
export function rotatedBounds(rect:{x:number;y:number;width:number;height:number},angle=0){const radians=angle*Math.PI/180,c=Math.abs(Math.cos(radians)),s=Math.abs(Math.sin(radians)),w=rect.width*c+rect.height*s,h=rect.height*c+rect.width*s;return {x:rect.x+rect.width/2-w/2,y:rect.y+rect.height/2-h/2,width:w,height:h};}
export function alignmentSession(bounds:AlignmentRect,targets:readonly AlignmentRect[]):AlignmentSession{
 const points=(axis:"x"|"y"):AlignmentPoint[]=>{const names=axis==="x"?["Left","Center","Right"]:["Top","Center","Bottom"],extent=axis==="x"?"width":"height";return targets.flatMap(target=>[0,.5,1].flatMap((factor,index)=>[0,.5,1].filter((_,i)=>!target.canvas||i===index).map(f=>{const movingIndex=f*2,line=target[axis]+target[extent]*factor;return {key:`${target.id}-${axis}-${index}-${movingIndex}`,value:line-bounds[extent]*f,line,axis,target,movingAnchor:movingIndex,label:`${names[movingIndex]} ↔ ${names[index]} · ${target.label}`};})));};
 return {bounds,x:points("x"),y:points("y"),heldX:null,heldY:null};
}
export function alignRectangle(session:AlignmentSession,x:number,y:number,zoom:number,bypass=false){
 const scale=Math.max(.01,zoom),sx=bypass?{value:x,target:null}:magneticSnap(x,session.x,6/scale,11/scale,session.heldX),sy=bypass?{value:y,target:null}:magneticSnap(y,session.y,6/scale,11/scale,session.heldY);
 session.heldX=sx.target as AlignmentPoint|null;session.heldY=sy.target as AlignmentPoint|null;
 const rect={...session.bounds,x:sx.value,y:sy.value},guides:AlignmentGuide[]=[];
 for(const point of [session.heldX,session.heldY])if(point){const start=point.axis==="x"?"y":"x",extent=point.axis==="x"?"height":"width";guides.push({axis:point.axis,value:point.line,from:Math.min(rect[start],point.target[start]),to:Math.max(rect[start]+rect[extent],point.target[start]+point.target[extent]),label:point.label,target:point.target});}
 return {x:sx.value,y:sy.value,guides};
}
