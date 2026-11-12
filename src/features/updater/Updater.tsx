import {StatusMessage,type StatusTone} from "../../components/ui/status";
import {useEffect,useState} from "react";
import {invoke,isTauri} from "@tauri-apps/api/core";
import {listen} from "@tauri-apps/api/event";
import {check} from "@tauri-apps/plugin-updater";
import {relaunch} from "@tauri-apps/plugin-process";
import {CloudSync} from "lucide-react";
import {recordDiagnostic} from "../../platform/diagnostics";
import {APP_VERSION} from "../../app-info";
import {Button} from "../../components/ui/button";
import {openPreferencesWindow} from "../../platform/preferences-window";
import {INITIAL_UPDATE,UpdateController,type UpdateState,type Action} from "./controller";
import "./updater.css";
let controller:UpdateController|undefined;
let publication=Promise.resolve();
async function prepare(){const promises:Promise<unknown>[]=[];window.dispatchEvent(new CustomEvent("fershot-before-update",{detail:promises}));await Promise.all(promises);}
/** Mounted once in main, which stays alive when Edit is hidden. */
export function UpdaterHost(){useEffect(()=>{
 if(!isTauri())return;
 controller??=new UpdateController({configured:()=>invoke<boolean>("updater_configuration"),claim:manual=>invoke<boolean>("claim_update_check",{manual}),check:()=>check({timeout:20000}),publish:snapshot=>{if(snapshot.error)recordDiagnostic("app","failed","other",{operation:`updater_${snapshot.error}`});publication=publication.then(()=>invoke<void>("publish_update_state",{snapshot})).catch(()=>{});},prepare,begin:()=>invoke("begin_update_install"),end:()=>invoke("end_update_install"),restart:()=>relaunch()});
 let live=true,off:(()=>void)|undefined;
 void listen<Action>("fershot-updater-action",event=>{void controller!.run(event.payload);}).then(dispose=>{if(live)off=dispose;else dispose();});
 const daily=()=>{void controller!.run("check",false);};const initial=setTimeout(daily,10000);const timer=setInterval(daily,60*60*1000);
 const wake=()=>{if(!document.hidden)daily();};document.addEventListener("visibilitychange",wake);
 return()=>{live=false;off?.();clearTimeout(initial);clearInterval(timer);document.removeEventListener("visibilitychange",wake);};
 },[]);return null;}
function useUpdateState(){const [state,setState]=useState<UpdateState>(INITIAL_UPDATE);useEffect(()=>{if(!isTauri())return;let live=true,off:(()=>void)|undefined;void listen<UpdateState>("fershot-update-state",e=>{if(live)setState(e.payload);}).then(async dispose=>{if(!live){dispose();return;}off=dispose;const value=await invoke<UpdateState>("read_update_state");if(live&&value)setState(value);}).catch(()=>{});return()=>{live=false;off?.();};},[]);return state;}
const messages:Record<UpdateState["phase"],string>={idle:"Checks daily while the app is running.",unconfigured:"Updates are not configured in this build.",checking:"Checking for updates…",current:"You're up to date.",available:"An update is available.",downloading:"Downloading update…",downloaded:"Download verified. Ready to install.",installing:"Installing update…",installed:"Update installed. Restart to finish.",restarting:"Restarting…",error:"Update failed. Please retry."};
const phaseTone=(phase:UpdateState["phase"]):StatusTone=>["current","downloaded","installed"].includes(phase)?"success":phase==="error"?"error":phase==="unconfigured"?"warning":"info";
const errors={check:"Could not check GitHub Releases. Check your connection and try again.",download:"Download or signature verification failed. Check again and retry.",install:"Installation failed. Check app permissions and check again.",restart:"Restart failed. Quit and reopen FerShot X.",busy:"Finish image operations and FTP transfers before installing.",storage:"Update schedule could not be saved. Check storage and retry."};
export function UpdateSettings(){const state=useUpdateState();const busy=["checking","downloading","installing","restarting"].includes(state.phase);const request=(action:Action)=>{void invoke("request_update",{action}).catch(()=>setRequestError("Update request failed. Reopen Settings and retry."));};const [requestError,setRequestError]=useState("");return <fieldset className="update-settings"><legend><CloudSync size={15} aria-hidden="true"/> App updates</legend>
 <div className="preference-row"><span>Current version</span><strong>{APP_VERSION}</strong></div>
 {state.availableVersion&&<div className="preference-row"><span>Available version</span><strong>{state.availableVersion}</strong></div>}
 <StatusMessage tone={requestError?"error":phaseTone(state.phase)} className="preference-help">{requestError||messages[state.phase]}</StatusMessage>
 {state.error&&<StatusMessage tone="error" className="preference-help">{errors[state.error]}</StatusMessage>}
 {state.phase==="downloading"&&<div className="update-download"><progress aria-label="Update download progress" max={state.total||undefined} value={state.total?Math.min(state.downloaded,state.total):undefined}/><span>{(state.downloaded/1048576).toFixed(1)} MB{state.total?` / ${(state.total/1048576).toFixed(1)} MB`:""}</span></div>}
 <div className="update-actions"><Button variant="outline" size="sm" disabled={busy||state.phase==="installed"||!isTauri()} onClick={()=>{setRequestError("");request("check");}}><CloudSync size={15} aria-hidden="true"/>Check for Updates</Button>
 {state.phase==="available"&&<Button size="sm" onClick={()=>request("download")}>Download Update</Button>}
 {(state.phase==="downloaded"||state.phase==="error"&&state.error==="busy")&&<Button size="sm" onClick={()=>request("install")}>Install Update</Button>}
 {state.phase==="installed"&&<Button size="sm" onClick={()=>request("restart")}>Restart App</Button>}</div>
 </fieldset>;}
export function UpdateNotice(){const state=useUpdateState();if(state.phase!=="available"&&state.phase!=="downloaded"&&state.phase!=="installed")return null;return <aside className="update-notice" aria-label="App update available"><CloudSync size={16} aria-hidden="true"/><span>{state.phase==="installed"?"Restart to finish updating":`FerShot X ${state.availableVersion} is ready`}</span><Button size="sm" variant="outline" onClick={()=>void openPreferencesWindow("updates")}>View Update</Button></aside>;}
