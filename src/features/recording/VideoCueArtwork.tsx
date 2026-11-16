import {useEffect,useState} from "react";
import {Arrow,Rect,Text,Image as CanvasImage} from "react-konva";
import type {VideoHighlight} from "./model";
import {cueKind} from "./timeline";
function InsertedImage({cue,width,height}:{cue:VideoHighlight;width:number;height:number}){const [image,setImage]=useState<HTMLImageElement|null>(null);useEffect(()=>{let live=true;const im=new window.Image();im.onload=()=>{if(live)setImage(im);};im.src=cue.imagePng??"";return()=>{live=false;};},[cue.imagePng]);return image?<CanvasImage image={image} width={cue.width*width} height={cue.height*height} opacity={cue.opacity}/>:null;}
export function VideoCueArtwork({cue,width,height,scale}:{cue:VideoHighlight;width:number;height:number;scale:number}){
 const kind=cueKind(cue),w=cue.width*width,h=cue.height*height;
 if(kind==="image")return <InsertedImage cue={cue} width={width} height={height}/>;
 if(kind==="arrow")return <Arrow points={[cue.reverseX?w:0,cue.reverseY?h:0,cue.reverseX?0:w,cue.reverseY?0:h]} stroke={cue.color} fill={cue.color} strokeWidth={(cue.strokeWidth??3)*scale} pointerLength={Math.max(8,(cue.strokeWidth??3)*3)*scale} pointerWidth={Math.max(8,(cue.strokeWidth??3)*3)*.8*scale} lineCap="round" opacity={cue.opacity}/>;
 if(kind==="text")return <Text text={cue.text??""} width={w} height={h} padding={4*scale} fontSize={(cue.fontSize??32)*scale} lineHeight={1.2} fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" fill={cue.color} opacity={cue.opacity}/>;
 return <Rect width={w} height={h} fill={cue.color} opacity={kind==="cover"?1:cue.opacity}/>;
}
