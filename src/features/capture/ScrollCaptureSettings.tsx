import {useSettingsAutosave} from "../../use-settings-autosave";
import {useEffect,useRef,useState} from "react";
import {invoke,isTauri} from "@tauri-apps/api/core";
import {Slider} from "../../components/ui/slider";
import {StatusMessage,type StatusTone} from "../../components/ui/status";
function valid(value:unknown):number{const speed=(value as {speed?:unknown})?.speed;if(typeof speed!=="number"||!Number.isInteger(speed)||speed<1||speed>5)throw Error("Invalid scroll speed.");return speed;}
export function ScrollCaptureSettings(){const [speed,setSpeed]=useState(3),[ready,setReady]=useState(false),[notice,setNotice]=useState(""),[tone,setTone]=useState<StatusTone>("info");const live=useRef(false);
 const autosave=useSettingsAutosave<number>(async speed=>{valid(await invoke("save_scroll_preferences",{speed}));if(live.current){setTone("success");setNotice("Scroll speed saved.");}},()=>{if(live.current){setTone("error");setNotice("Scroll speed could not be saved. Change it to retry.");}});
 useEffect(()=>{live.current=true;if(isTauri())void invoke("read_scroll_preferences").then(value=>{if(live.current){setSpeed(valid(value));setReady(true);}}).catch(()=>{if(live.current){setTone("error");setNotice("Scroll settings could not be loaded.");}});return()=>{live.current=false;};},[]);
 return <fieldset aria-label="Scroll capture" disabled={!ready}><h3 className="preference-section-title">Scroll capture</h3><label className="preference-row"><span>Scroll speed</span><div className="preference-range"><Slider aria-label="Scroll capture speed" min={1} max={5} step={1} value={speed} onValueChange={next=>{setSpeed(next);setNotice("");autosave.schedule(next);}}/><output>{["","Slowest","Slow","Balanced","Fast","Fastest"][speed]}</output></div></label>{tone==="error"&&notice&&<StatusMessage tone={tone}>{notice}</StatusMessage>}</fieldset>;
}
