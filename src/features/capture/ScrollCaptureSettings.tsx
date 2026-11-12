import {useEffect,useRef,useState} from "react";
import {invoke,isTauri} from "@tauri-apps/api/core";
import {Slider} from "../../components/ui/slider";
import {Button} from "../../components/ui/button";
import {StatusMessage,type StatusTone} from "../../components/ui/status";
function valid(value:unknown):number{const speed=(value as {speed?:unknown})?.speed;if(typeof speed!=="number"||!Number.isInteger(speed)||speed<1||speed>5)throw Error("Invalid scroll speed.");return speed;}
export function ScrollCaptureSettings(){const [speed,setSpeed]=useState(3),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[tone,setTone]=useState<StatusTone>("info");const live=useRef(false);
 useEffect(()=>{live.current=true;if(isTauri())void invoke("read_scroll_preferences").then(value=>{if(live.current){setSpeed(valid(value));setReady(true);}}).catch(()=>{if(live.current){setTone("error");setNotice("Scroll settings could not be loaded.");}});return()=>{live.current=false;};},[]);
 return <fieldset disabled={!ready||busy}><legend>Scroll capture</legend><label className="preference-row"><span>Scroll speed</span><div className="preference-range"><Slider aria-label="Scroll capture speed" min={1} max={5} step={1} value={speed} onValueChange={setSpeed}/><output>{["","Slowest","Slow","Balanced","Fast","Fastest"][speed]}</output></div></label><div className="flex justify-end"><Button variant="outline" size="sm" onClick={()=>{if(busy)return;setBusy(true);setNotice("");void invoke("save_scroll_preferences",{speed}).then(value=>{const saved=valid(value);if(live.current){setSpeed(saved);setTone("success");setNotice("Scroll speed saved.");}}).catch(()=>{if(live.current){setTone("error");setNotice("Scroll speed could not be saved.");}}).finally(()=>{if(live.current)setBusy(false);});}}>Save scroll speed</Button></div>{notice&&<StatusMessage tone={tone}>{notice}</StatusMessage>}</fieldset>;
}
