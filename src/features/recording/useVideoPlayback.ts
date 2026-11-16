import {useCallback,useEffect,useRef,useState,type RefObject} from "react";
import type {VideoDraft} from "./model";
import {mediaAt} from "./timeline";
/** One project clock drives independent video/audio source spans and gaps. */
export function useVideoPlayback(draft:VideoDraft,video:RefObject<HTMLVideoElement|null>){
 const [playbackError,setPlaybackError]=useState("");
 const audio=useRef<HTMLAudioElement>(null),[time,setTime]=useState(draft.startMs),[playing,setPlaying]=useState(false),clock=useRef(draft.startMs),live=useRef(draft),running=useRef(false),epoch=useRef({at:0,time:0});live.current=draft;
 const sync=useCallback((at:number,play:boolean)=>{const d=live.current;for(const [kind,node] of [["video",video.current],["audio",audio.current]]as const){if(!node)continue;const point=mediaAt(d,kind,at);node.muted=kind==="video"||d.muted;const audible=kind!=="audio"||!d.muted;if(!point.visible||!audible){node.pause();continue;}if(Math.abs(node.currentTime-point.sourceMs/1000)>.08||!play){try{node.currentTime=point.sourceMs/1000;}catch{/* Await metadata; source remains retained. */}}if(play&&node.paused)void node.play().catch(error=>{if(!running.current||error?.name==="AbortError")return;running.current=false;video.current?.pause();audio.current?.pause();setPlaying(false);setPlaybackError("Video playback failed. Retry or reopen from Library.");});else if(!play&&!node.paused)node.pause();}},[video]);
 const pause=useCallback(()=>{running.current=false;video.current?.pause();audio.current?.pause();setPlaying(false);},[video]);
 const seek=useCallback((value:number)=>{const at=Math.max(0,Math.min(live.current.endMs,value));clock.current=at;epoch.current={at:performance.now(),time:at};setTime(at);sync(at,running.current);},[sync]);
 const toggle=useCallback(()=>{setPlaybackError("");if(running.current){pause();return;}const d=live.current;if(clock.current<d.startMs||clock.current>=d.endMs)clock.current=d.startMs;epoch.current={at:performance.now(),time:clock.current};running.current=true;setPlaying(true);sync(clock.current,true);},[pause,sync]);
 useEffect(()=>{let frame=0,last=0;const tick=(now:number)=>{if(!running.current)return;const end=live.current.endMs,at=Math.min(end,epoch.current.time+now-epoch.current.at);clock.current=at;sync(at,true);if(now-last>=30||at>=end){setTime(at);last=now;}if(at>=end){pause();return;}frame=requestAnimationFrame(tick);};if(playing)frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing,pause,sync]);
 useEffect(()=>{if(!running.current)sync(clock.current,false);},[draft,sync]);
 useEffect(()=>{const visibility=()=>{if(document.hidden)pause();};document.addEventListener("visibilitychange",visibility);return()=>{document.removeEventListener("visibilitychange",visibility);video.current?.pause();audio.current?.pause();running.current=false;};},[pause,video]);
 return {audio,time,playing,seek,toggle,pause,playbackError,videoVisible:mediaAt(draft,"video",time).visible};
}
