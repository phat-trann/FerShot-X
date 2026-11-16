import {Audio} from "../../components/ui/audio";
import {useVideoPlayback} from "./useVideoPlayback";
import {useEffect,useRef,useState} from "react";
import {Play,Pause} from "lucide-react";
import {Video} from "../../components/ui/video";
import {Button} from "../../components/ui/button";
import {Slider} from "../../components/ui/slider";
import {videoSource} from "../../platform/recording";
import {formatTime,type VideoClip,type VideoDocument} from "./model";
import {VideoEffects} from "./VideoEffects";
export function VideoPreview({clip,document:doc}:{clip:VideoClip;document?:VideoDocument|null}){
 const video=useRef<HTMLVideoElement>(null),host=useRef<HTMLDivElement>(null),[error,setError]=useState(false),[size,setSize]=useState({width:640,height:360});
 const draft=doc?.draft??{schemaVersion:1 as const,startMs:0,endMs:clip.durationMs,muted:false,cursorVisible:false,cursorSize:24,clickHighlight:false,highlights:[]};
 const {audio,time,playing,seek,toggle,playbackError,videoVisible}=useVideoPlayback(draft,video);
 const start=draft.startMs,end=draft.endMs,scale=Math.min(size.width/clip.width,size.height/clip.height),width=clip.width*scale,height=clip.height*scale;
 useEffect(()=>{const element=host.current;if(!element)return;const measure=()=>setSize({width:Math.max(1,element.clientWidth),height:Math.max(1,element.clientHeight)});const observer=new ResizeObserver(measure);observer.observe(element);measure();return()=>observer.disconnect();},[]);
 return <div className="library-video-preview" ref={host}>{error||playbackError?<p role="alert">Video playback failed. Refresh to retry.</p>:<><div className="library-video-frame" style={{width,height}}><Video ref={video} src={videoSource(clip)} poster={clip.poster||undefined} muted style={{visibility:videoVisible?"visible":"hidden"}} aria-label={clip.name} onLoadedMetadata={()=>seek(start)} onError={()=>setError(true)}/>{clip.hasAudio!==false&&<Audio ref={audio} src={videoSource(clip)} muted={draft.muted}/>}{doc&&<VideoEffects draft={doc.draft} pointer={doc.pointer} time={time} width={width} height={height} scale={scale}/>}</div><div className="library-video-controls"><Button icon={playing?Pause:Play} variant="plain" size="icon" aria-label={playing?"Pause preview":"Play preview"} onClick={toggle}/><Slider aria-label="Preview video position" min={start} max={end} step={10} value={Math.max(start,Math.min(end,time))} onValueChange={seek}/><output>{formatTime(time-start)}</output></div></>}</div>;
}
