import {forwardRef,type AudioHTMLAttributes} from "react";
export const Audio=forwardRef<HTMLAudioElement,AudioHTMLAttributes<HTMLAudioElement>>(function Audio(props,ref){return <audio {...props} ref={ref} preload="metadata"/>;});
