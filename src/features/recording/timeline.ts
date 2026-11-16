import {pointerAt,clicksAt,type VideoDraft,type PointerSample,type VideoHighlight} from "./model";
export type LayerKind="video"|"audio"|"cursor"|"clicks"|"highlight"|"arrow"|"text"|"cover"|"image";
export interface TimelineClip {id:string;startMs:number;endMs:number;sourceStartMs:number}
export interface VideoLayer {id:string;kind:LayerKind;enabled:boolean;locked:boolean;highlightId?:string;clips:TimelineClip[]}
export interface VideoTimeline {layers:VideoLayer[]}
export interface CursorAsset {png:string;width:number;height:number;hotspotX:number;hotspotY:number}
export const MAX_TIMELINE_MS=30*60*1000;
export const layerName=(layer:VideoLayer)=>({video:"Video",audio:"Audio",cursor:"Cursor",clicks:"Clicks",highlight:"Highlight",arrow:"Arrow",text:"Text",cover:"Cover",image:"Image"})[layer.kind];
export function withTimeline(draft:VideoDraft,duration:number,hasPointer:boolean,hasAudio=true):VideoDraft{
 if(draft.timeline){const layers=draft.timeline.layers.filter(l=>hasAudio||l.kind!=="audio").map(l=>l.kind==="cursor"&&!draft.cursorVisible||l.kind==="clicks"&&!draft.clickHighlight?{...l,enabled:false}:l);if(layers.length===draft.timeline.layers.length&&draft.cursorVisible&&draft.clickHighlight)return draft;return {...draft,cursorVisible:true,clickHighlight:true,timeline:{layers}};}
 const full=(id:string,kind:LayerKind,enabled:boolean):VideoLayer=>({id,kind,enabled,locked:false,clips:[{id:`${id}-clip`,startMs:0,endMs:duration,sourceStartMs:0}]});
 return {...draft,cursorVisible:true,clickHighlight:true,timeline:{layers:[full("video","video",true),...(hasAudio?[full("audio","audio",!draft.muted)]:[]),...(hasPointer?[full("cursor","cursor",draft.cursorVisible),full("clicks","clicks",draft.clickHighlight)]:[]),...draft.highlights.map(c=>highlightLayer(c))]}};
}
export const cueKind=(cue:VideoHighlight)=>cue.kind??"highlight";
export const isAnnotationLayer=(kind:LayerKind)=>["highlight","arrow","text","cover","image"].includes(kind);
export function highlightLayer(cue:VideoHighlight):VideoLayer{return {id:`layer-${cue.id}`,kind:cueKind(cue),enabled:true,locked:false,highlightId:cue.id,clips:[{id:`clip-${cue.id}`,startMs:cue.startMs,endMs:cue.endMs,sourceStartMs:0}]};}
export function timelineDuration(draft:VideoDraft,duration:number){return Math.max(duration,...(draft.timeline?.layers.flatMap(l=>l.clips.map(c=>c.endMs))??[]));}
export function activeClip(layer:VideoLayer|undefined,time:number){return layer?.enabled?layer.clips.find(c=>time>=c.startMs&&time<c.endMs):undefined;}
export function mediaAt(draft:VideoDraft,kind:"video"|"audio",time:number){if(!draft.timeline)return {sourceMs:time,visible:true};const layer=draft.timeline.layers.find(l=>l.kind===kind),clip=activeClip(layer,time);return {sourceMs:clip?clip.sourceStartMs+time-clip.startMs:0,visible:!!clip};}
export function pointerLayers(draft:VideoDraft,pointer:readonly PointerSample[],time:number){
 if(!draft.timeline)return {cursors:draft.cursorVisible?[pointerAt(pointer,time)].filter((p):p is PointerSample=>!!p&&p.visible):[],clicks:draft.clickHighlight?clicksAt(pointer,time):[]};
 const cursors:PointerSample[]=[],clicks:PointerSample[]=[];
 for(const layer of draft.timeline.layers){const clip=activeClip(layer,time);if(!clip)continue;const source=clip.sourceStartMs+time-clip.startMs;
 if(layer.kind==="cursor"&&draft.cursorVisible){const p=pointerAt(pointer,source);if(p?.visible)cursors.push(p);}
 if(layer.kind==="clicks"&&draft.clickHighlight)for(const p of clicksAt(pointer,source)){if(p.timeMs>=clip.sourceStartMs)clicks.push({...p,timeMs:clip.startMs+p.timeMs-clip.sourceStartMs});}
 }return {cursors,clicks};
}
export function visibleHighlights(draft:VideoDraft,time:number){if(!draft.timeline)return draft.highlights.filter(c=>time>=c.startMs&&time<c.endMs);return draft.timeline.layers.filter(l=>isAnnotationLayer(l.kind)&&activeClip(l,time)).flatMap(l=>{const cue=draft.highlights.find(c=>c.id===l.highlightId);return cue?[cue]:[];});}
export function editLayer(draft:VideoDraft,id:string,change:(layer:VideoLayer)=>VideoLayer){return {...draft,timeline:{layers:draft.timeline!.layers.map(l=>l.id===id?change(l):l)}};}
export function splitClip(draft:VideoDraft,layerId:string,clipId:string,time:number,id:string=crypto.randomUUID()):VideoDraft{
 const layer=draft.timeline?.layers.find(l=>l.id===layerId),clip=layer?.clips.find(c=>c.id===clipId);const at=Math.round(time);
 if(!layer||layer.locked||!clip||at-clip.startMs<100||clip.endMs-at<100)return draft;
 return editLayer(draft,layerId,l=>({...l,clips:l.clips.flatMap(c=>c.id===clipId?[{...c,endMs:at},{...c,id,startMs:at,sourceStartMs:c.sourceStartMs+at-c.startMs}]:[c])}));
}
export function duplicateClip(draft:VideoDraft,layerId:string,clipId:string,id:string=crypto.randomUUID()):VideoDraft{
 const layer=draft.timeline?.layers.find(l=>l.id===layerId),clip=layer?.clips.find(c=>c.id===clipId);if(!layer||layer.locked||!clip||layer.clips.length>=64)return draft;
 let start=clip.endMs;for(const next of [...layer.clips].sort((a,b)=>a.startMs-b.startMs)){if(next.endMs<=start)continue;if(start+clip.endMs-clip.startMs<=next.startMs)break;start=next.endMs;}
 const end=start+clip.endMs-clip.startMs;if(end>MAX_TIMELINE_MS)return draft;
 const result=editLayer(draft,layerId,l=>({...l,clips:[...l.clips,{...clip,id,startMs:start,endMs:end}].sort((a,b)=>a.startMs-b.startMs)}));return {...result,endMs:Math.max(result.endMs,end)};
}
export function deleteClip(draft:VideoDraft,layerId:string,clipId:string):VideoDraft{const layer=draft.timeline?.layers.find(l=>l.id===layerId);if(!layer||layer.locked)return draft;const next=editLayer(draft,layerId,l=>({...l,clips:l.clips.filter(c=>c.id!==clipId)}));const layers=next.timeline!.layers.filter(l=>l.kind==="video"||l.clips.length);return {...next,timeline:{layers},highlights:next.highlights.filter(h=>layers.some(l=>l.highlightId===h.id))};}
export function validTimeline(timeline:VideoTimeline,duration:number,highlights:readonly VideoHighlight[]){
 if(!Array.isArray(timeline.layers)||!timeline.layers.length||timeline.layers.length>32||timeline.layers.filter(l=>l.kind==="video").length!==1||timeline.layers.filter(l=>l.kind==="audio").length>1)return false;
 const ids=new Set<string>();let count=0;for(const layer of timeline.layers){if(!/^[\w-]{1,96}$/.test(layer.id)||ids.has(layer.id)||!["video","audio","cursor","clicks","highlight","arrow","text","cover","image"].includes(layer.kind)||typeof layer.enabled!=="boolean"||typeof layer.locked!=="boolean"||layer.clips.length>64)return false;ids.add(layer.id);if(isAnnotationLayer(layer.kind)&&!highlights.some(h=>h.id===layer.highlightId))return false;let end=0;for(const c of [...layer.clips].sort((a,b)=>a.startMs-b.startMs)){if(!/^[\w-]{1,96}$/.test(c.id)||ids.has(c.id)||![c.startMs,c.endMs,c.sourceStartMs].every(Number.isSafeInteger)||c.startMs<end||c.startMs<0||c.endMs-c.startMs<100||c.endMs>MAX_TIMELINE_MS||c.sourceStartMs<0||(!isAnnotationLayer(layer.kind)&&c.sourceStartMs+c.endMs-c.startMs>duration))return false;ids.add(c.id);end=c.endMs;if(++count>256)return false;}}return true;
}
/** Remove a video interval and close it across all unlocked layers. */
export function rippleDelete(draft:VideoDraft,layerId:string,clipId:string):VideoDraft{
 const layer=draft.timeline?.layers.find(l=>l.id===layerId),clip=layer?.clips.find(c=>c.id===clipId);if(!layer||layer.kind!=="video"||!clip||draft.timeline!.layers.some(l=>l.locked))return draft;
 const from=clip.startMs,to=clip.endMs,length=to-from,map=(t:number)=>t-Math.max(0,Math.min(length,t-from));
 const startMs=map(draft.startMs),endMs=map(draft.endMs);if(endMs-startMs<100)return draft;
 return {...draft,startMs,endMs,timeline:{layers:draft.timeline!.layers.map(l=>({...l,clips:l.clips.flatMap(c=>{
  if(c.endMs<=from)return [c];if(c.startMs>=to)return [{...c,startMs:c.startMs-length,endMs:c.endMs-length}];
  const pieces:TimelineClip[]=[];if(c.startMs<from)pieces.push({...c,endMs:from});if(c.endMs>to)pieces.push({...c,id:pieces.length?crypto.randomUUID():c.id,startMs:from,endMs:c.endMs-length,sourceStartMs:c.sourceStartMs+to-c.startMs});return pieces.filter(c=>c.endMs-c.startMs>=100);
 })}))}};
}
