import {forwardRef,type VideoHTMLAttributes} from "react";
/** Native hardware playback; product transport controls remain in the shared toolbar. */
export const Video=forwardRef<HTMLVideoElement,VideoHTMLAttributes<HTMLVideoElement>>(function Video(props,ref){return <video {...props} ref={ref} playsInline preload="metadata"/>;});
