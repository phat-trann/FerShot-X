import {validTimeline,timelineDuration,type VideoTimeline,type CursorAsset} from "./timeline";
export interface RecordingSettings {systemAudio:boolean;microphone:boolean;recordPointer:boolean}
export interface PointerSample {timeMs:number;x:number;y:number;visible:boolean;left:boolean;right:boolean}
export type VideoAnnotationKind="highlight"|"arrow"|"text"|"cover"|"image";
export interface VideoHighlight {imagePng?:string;kind?:VideoAnnotationKind;text?:string;fontSize?:number;strokeWidth?:number;reverseX?:boolean;reverseY?:boolean;id:string;startMs:number;endMs:number;x:number;y:number;width:number;height:number;color:string;opacity:number}
export interface VideoDraft {schemaVersion:1;startMs:number;endMs:number;muted:boolean;cursorVisible:boolean;cursorSize:number;clickHighlight:boolean;highlights:VideoHighlight[];timeline?:VideoTimeline;cursorStyle?:"system"|"custom";cursorColor?:string;cursorAsset?:CursorAsset}
export interface VideoClip {revision?:string;id:string;name:string;width:number;height:number;durationMs:number;byteSize:number;createdAt:number;mediaPath:string;poster:string;hasAudio?:boolean}
export interface VideoDocument {clip:VideoClip;draft:VideoDraft;pointer:PointerSample[]}
export interface RecordingStatus {phase:"idle"|"starting"|"recording"|"stopping"|"ready"|"failed";elapsedMs:number;clipId?:string|null;error?:string|null}
export const DEFAULT_RECORDING_SETTINGS:RecordingSettings={systemAudio:false,microphone:false,recordPointer:true};
export const formatTime=(milliseconds:number)=>{const seconds=Math.max(0,Math.floor(milliseconds/1000));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;};
/** Binary search keeps 30-minute recordings cheap to preview, independent of length. */
export function pointerIndex(samples:readonly PointerSample[],timeMs:number){let lo=0,hi=samples.length;while(lo<hi){const mid=(lo+hi)>>>1;if(samples[mid].timeMs<=timeMs)lo=mid+1;else hi=mid;}return lo-1;}
export function pointerAt(samples:readonly PointerSample[],timeMs:number):PointerSample|null{const i=pointerIndex(samples,timeMs);if(i<0)return samples[0]??null;const a=samples[i],b=samples[i+1];if(!b||!a.visible||!b.visible||b.timeMs<=a.timeMs)return a;const t=Math.max(0,Math.min(1,(timeMs-a.timeMs)/(b.timeMs-a.timeMs)));return {...a,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
export function clicksAt(samples:readonly PointerSample[],timeMs:number){const found:PointerSample[]=[];for(let i=pointerIndex(samples,timeMs);i>=0&&samples[i].timeMs>=timeMs-450;i--){const p=samples[i],before=samples[i-1];if(p.visible&&((p.left&&!before?.left)||(p.right&&!before?.right)))found.push(p);}return found;}
export function validDraft(draft:VideoDraft,duration:number){return draft.schemaVersion===1&&Number.isFinite(draft.startMs)&&Number.isFinite(draft.endMs)&&draft.startMs>=0&&draft.endMs<=timelineDuration(draft,duration)&&draft.endMs-draft.startMs>=100&&draft.cursorSize>=12&&draft.cursorSize<=96&&draft.highlights.length<=128&&(!draft.timeline||validTimeline(draft.timeline,duration,draft.highlights));}
/** Native draft timestamps are u64 milliseconds. Playback remains fractional;
 * only committed/editable timestamps cross this boundary as integer millis. */
export function videoMilliseconds(value:number){if(!Number.isFinite(value)||value<0||value>30*60*1000)throw new Error("Invalid video timestamp.");return Math.round(value);}
export function cueTimeRange(time:number,start:number,end:number){const from=Math.max(videoMilliseconds(start),Math.min(videoMilliseconds(time),videoMilliseconds(end)-100));return {startMs:from,endMs:Math.max(from+100,Math.min(videoMilliseconds(end),from+3000))};}
export function nativeVideoDraft(draft:VideoDraft):VideoDraft{return {...draft,startMs:videoMilliseconds(draft.startMs),endMs:videoMilliseconds(draft.endMs),highlights:draft.highlights.map(c=>({...c,startMs:videoMilliseconds(c.startMs),endMs:videoMilliseconds(c.endMs)})),...(draft.timeline?{timeline:{layers:draft.timeline.layers.map(l=>({...l,clips:l.clips.map(c=>({...c,startMs:videoMilliseconds(c.startMs),endMs:videoMilliseconds(c.endMs),sourceStartMs:videoMilliseconds(c.sourceStartMs)}))}))}}:{})};}
