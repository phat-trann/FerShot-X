import {useEffect,useRef,useState} from "react";
import {CheckboxField} from "../../components/ui/field";
import {StatusMessage} from "../../components/ui/status";
import {readRecordingSettings,saveRecordingSettings} from "../../platform/recording";
import {useSettingsAutosave} from "../../use-settings-autosave";
import {DEFAULT_RECORDING_SETTINGS,type RecordingSettings as Settings} from "./model";
export function RecordingSettings(){const [value,setValue]=useState<Settings>(DEFAULT_RECORDING_SETTINGS),[ready,setReady]=useState(false),[error,setError]=useState("");const alive=useRef(false);const save=useSettingsAutosave<Settings>(async next=>{await saveRecordingSettings(next);if(alive.current)setError("");},error=>{if(alive.current)setError(error instanceof Error?error.message:"Recording settings could not be saved.");});useEffect(()=>{alive.current=true;void readRecordingSettings().then(value=>{if(alive.current){setValue(value);setReady(true);}}).catch(error=>{if(alive.current)setError(error.message);});return()=>{alive.current=false;};},[]);function patch(key:keyof Settings,checked:boolean){const next={...value,[key]:checked};setValue(next);setError("");save.schedule(next);}
 return <fieldset aria-label="Screen recording" disabled={!ready}><h3 className="preference-section-title">Screen recording</h3><CheckboxField label="System audio" checked={value.systemAudio} onCheckedChange={checked=>patch("systemAudio",checked)}/><CheckboxField label="Microphone" checked={value.microphone} onCheckedChange={checked=>patch("microphone",checked)}/><CheckboxField label="Mouse metadata" checked={value.recordPointer} onCheckedChange={checked=>patch("recordPointer",checked)}/>{error&&<StatusMessage tone="error">{error}</StatusMessage>}</fieldset>;
}
