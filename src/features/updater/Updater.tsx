import { Check, LoaderCircle, PackageCheck, RotateCw } from "lucide-react";
import { Progress } from "../../components/ui/progress";
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
import {ToolHint} from "../../components/ui/tool-hint";
import {INITIAL_UPDATE,UpdateController,type UpdateState,type Action} from "./controller";
import "./updater.css";
let controller:UpdateController|undefined;
let startupChecked=false;
let publication=Promise.resolve();
async function prepare(){const promises:Promise<unknown>[]=[];window.dispatchEvent(new CustomEvent("fershot-before-update",{detail:promises}));await Promise.all(promises);}
/** Mounted once in main, which stays alive when Edit is hidden. */
export function UpdaterHost(){useEffect(()=>{
 if(!isTauri())return;
 controller??=new UpdateController({configured:()=>invoke<boolean>("updater_configuration"),claim:manual=>invoke<boolean>("claim_update_check",{manual}),check:()=>check({timeout:20000}),publish:snapshot=>{if(snapshot.error)recordDiagnostic("app","failed","other",{operation:`updater_${snapshot.error}`});publication=publication.then(()=>invoke<void>("publish_update_state",{snapshot})).catch(()=>{});},prepare,begin:()=>invoke("begin_update_install"),end:()=>invoke("end_update_install"),restart:()=>relaunch()});
 let live=true,off:(()=>void)|undefined;
 void listen<Action>("fershot-updater-action",event=>{void controller!.run(event.payload);}).then(dispose=>{if(live)off=dispose;else dispose();});
 const daily=()=>{void controller!.run("check",false);};if(!startupChecked){startupChecked=true;void controller!.run("check",true);}const timer=setInterval(daily,60*60*1000);
 const wake=()=>{if(!document.hidden)daily();};document.addEventListener("visibilitychange",wake);
 return()=>{live=false;off?.();clearInterval(timer);document.removeEventListener("visibilitychange",wake);};
 },[]);return null;}
function useUpdateState(){const [state,setState]=useState<UpdateState>(INITIAL_UPDATE);useEffect(()=>{if(!isTauri())return;let live=true,off:(()=>void)|undefined;void listen<UpdateState>("fershot-update-state",e=>{if(live)setState(e.payload);}).then(async dispose=>{if(!live){dispose();return;}off=dispose;const value=await invoke<UpdateState>("read_update_state");if(live&&value)setState(value);}).catch(()=>{});return()=>{live=false;off?.();};},[]);return state;}
const messages:Record<UpdateState["phase"],string>={idle:"Checks at launch and daily while running.",unconfigured:"Updates are not configured in this build.",checking:"Checking for updates…",current:"You're up to date.",available:"An update is available.",downloading:"Downloading update…",downloaded:"Download verified. Ready to install.",installing:"Installing update…",installed:"Update installed. Restart to finish.",restarting:"Restarting…",error:"Update failed. Please retry."};
const phaseTone=(phase:UpdateState["phase"]):StatusTone=>["current","downloaded","installed"].includes(phase)?"success":phase==="error"?"error":phase==="unconfigured"?"warning":"info";
const errors={check:"Could not check GitHub Releases. Check your connection and try again.",download:"Download or signature verification failed. Check again and retry.",install:"Installation failed. Check app permissions and check again.",restart:"Restart failed. Quit and reopen FerShot X.",busy:"Finish image operations and FTP transfers before installing.",storage:"Update schedule could not be saved. Check storage and retry."};
export function UpdateSettings(){
 const state=useUpdateState(),busy=["checking","downloading","installing","restarting"].includes(state.phase);
 const [requestError,setRequestError]=useState("");
 const request=(action:Action)=>{setRequestError("");void invoke("request_update",{action}).catch(()=>setRequestError("Update request failed. Reopen Settings and retry."));};
 const operation=!["idle","checking","current","available"].includes(state.phase);
 const checkIcon=state.phase==="checking"?LoaderCircle:state.phase==="current"?Check:CloudSync;
 const applyIcon=busy?LoaderCircle:state.phase==="installed"?RotateCw:PackageCheck;
 const applyLabel=state.phase==="installed"?"Restart App":"Install Update";
 return <fieldset aria-label="App updates" className="update-settings">
  <h3 className="preference-section-title">Updates</h3>
  <img className="update-app-icon" src="/fershot-icon.png" alt="FerShot X"/>
  <div className="preference-row"><span>Current version</span><div className="update-current-version"><strong>{APP_VERSION}</strong><ToolHint label="Check for Updates"><Button className={`settings-inline-icon update-check-icon ${state.phase==="checking"?"is-loading":""}`} data-current={state.phase==="current"?true:undefined} icon={checkIcon} aria-label="Check for Updates" aria-description={state.phase==="checking"?"Checking for updates":state.phase==="current"?"Up to date":undefined} variant="plain" size="icon" disabled={busy||state.phase==="installed"||!isTauri()} onClick={()=>request("check")}/></ToolHint></div></div>
  {state.availableVersion&&<div className="update-version-status" role="status" aria-label="Update version status"><span>New version <strong>{state.availableVersion}</strong></span><ToolHint label={applyLabel}><Button className={`settings-inline-icon ${busy?"is-loading":""}`} icon={applyIcon} aria-label={applyLabel} variant="plain" size="icon" disabled={busy||!isTauri()||state.phase==="error"&&state.error!=="busy"} onClick={()=>request("apply")}/></ToolHint></div>}
  {operation&&<StatusMessage tone={phaseTone(state.phase)} className="preference-help update-operation-status">{messages[state.phase]}</StatusMessage>}
  {requestError&&<StatusMessage tone="error">{requestError}</StatusMessage>}
  {state.error&&<StatusMessage tone="error" className="preference-help">{errors[state.error]}</StatusMessage>}
  {state.phase==="downloading"&&<div className="update-download"><Progress aria-label="Update download progress" max={state.total||undefined} value={state.total?Math.min(state.downloaded,state.total):undefined}/><span>{(state.downloaded/1048576).toFixed(1)} MB{state.total?` / ${(state.total/1048576).toFixed(1)} MB`:""}</span></div>}
 </fieldset>;
}
