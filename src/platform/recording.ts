import {isTauri,convertFileSrc} from "@tauri-apps/api/core";
import {invoke} from "./ipc";
import {listen} from "@tauri-apps/api/event";
import {nativeVideoDraft} from "../features/recording/model";
import type {RecordingSettings,RecordingStatus,VideoClip,VideoDocument,VideoDraft} from "../features/recording/model";
import type {FtpQueueItem} from "../contracts/phase2";
import {recordDiagnostic} from "./diagnostics";
async function call<T>(command:string,args?:Record<string,unknown>):Promise<T>{if(!isTauri())throw new Error("Screen recording requires the desktop app.");const start=performance.now();try{return await invoke<T>(command,args);}catch(error){const invalidArgs=typeof error==="string"&&/^invalid args/i.test(error);recordDiagnostic("capture","failed",invalidArgs?"invalid_input":error&&typeof error==="object"&&"code"in error?error.code:"other",{operation:command,durationMs:performance.now()-start});throw new Error(invalidArgs?"Video edit data could not be saved. Reopen the video and retry.":error&&typeof error==="object"&&"message"in error?String(error.message):"Video operation failed. Retry.");}}
export const readRecordingSettings=()=>call<RecordingSettings>("read_recording_settings");
export const saveRecordingSettings=(value:RecordingSettings)=>call<RecordingSettings>("save_recording_settings",{value});
export const readRecordingStatus=()=>call<RecordingStatus>("read_recording_status");
export const startRecording=(mode:"fullscreen"|"area"="fullscreen")=>call<void>("start_recording",{mode});
export const listRecordings=()=>call<VideoClip[]>("recording_list");
export const readRecording=(id:string)=>call<VideoDocument>("recording_document",{id});
export const saveVideoDraft=(id:string,draft:VideoDraft)=>call<void>("recording_save_draft",{id,draft:nativeVideoDraft(draft)});
export const removeRecording=(id:string)=>call<void>("recording_remove",{id});
export const openRecording=(id:string,requestId?:string)=>call<void>("recording_edit",{id,requestId});
export const takeVideoOpen=(lease:string)=>call<{id:string;requestId?:string;uploadImmediately?:boolean}|null>("recording_take",{lease});
export const failVideoOpen=(requestId:string)=>call<void>("recording_open_failed",{requestId});
export const saveVideo=(id:string,draft:VideoDraft)=>call<boolean>("recording_save",{request:{id,draft:nativeVideoDraft(draft)}});
export const copyVideo=(id:string,draft:VideoDraft)=>call<void>("recording_copy",{request:{id,draft:nativeVideoDraft(draft)}});
export const enqueueVideo=(id:string,draft:VideoDraft)=>call<FtpQueueItem>("ftp_enqueue_video",{request:{id,draft:nativeVideoDraft(draft)}});
export const readFtpVideo=(id:string,force=false)=>call<VideoClip>("ftp_video_preview",{id,force});
export const editFtpVideo=(id:string,requestId?:string)=>call<void>("ftp_edit_video",{id,requestId});
export const videoSource=(clip:VideoClip)=>clip.mediaPath.startsWith("data:video/")||clip.mediaPath.startsWith("blob:")?clip.mediaPath:convertFileSrc(clip.mediaPath);
export async function listenRecording(handler:(value:RecordingStatus)=>void){if(!isTauri())return()=>{};return listen<RecordingStatus>("fershot-recording-state",event=>handler(event.payload));}

export const readSystemCursor=()=>call<import("../features/recording/timeline").CursorAsset>("read_recording_cursor");

export const releaseRecordingEditor=(lease:string)=>call<void>("release_recording_editor",{lease});

export const releaseRecordingPreview=(id:string)=>call<void>("release_recording_preview",{id});
