import {serializeSettingsWrite,useSettingsAutosave} from "./use-settings-autosave";
import { RefreshCw } from "lucide-react";
import {ScrollCaptureSettings} from "./features/capture/ScrollCaptureSettings";
import {StatusMessage,type StatusTone} from "./components/ui/status";
import {UpdateSettings} from "./features/updater/Updater";
import { Radio } from "./components/ui/radio";
import { WindowTitleBar } from "./components/WindowTitleBar";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_APP_PREFERENCES, type FerShotAppPreferences } from "./features/app-preferences";
import { readApplicationPreferences, saveApplicationPreferences, readLoginState, setLaunchAtLogin, setMenuBarIcon, setWorkspaceOnTop, supportsNativeOutput } from "./platform/native";
import { WorkspaceFtpSettings } from "./Workspace.ftp";
import { WorkspaceDestination } from "./Workspace.destination";
import { WorkspaceShortcuts } from "./Workspace.shortcuts";
import { Settings2, Keyboard, CloudUpload, SlidersHorizontal, CloudSync } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "./components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { ToolHint } from "./components/ui/tool-hint";
import { CheckboxField } from "./components/ui/field";
import { LogSettings } from "./Workspace.logs";
import "./PreferencesWindow.css";
import { Slider } from "./components/ui/slider";

const TABS = ["general", "hotkeys", "uploading", "advanced", "updates"] as const;
type Tab = typeof TABS[number];
const TITLES: Record<Tab, string> = { general: "General", hotkeys: "Hotkeys", uploading: "Uploading", advanced: "Advanced", updates:"Updates" };
const TAB_ICONS = { general: Settings2, hotkeys: Keyboard, uploading: CloudUpload, advanced: SlidersHorizontal,updates:CloudSync };
function TabIcon({tab}: {tab: Tab}) { const Icon = TAB_ICONS[tab]; return <Icon size={25.92} strokeWidth={1.6} aria-hidden="true"/>; }

export default function PreferencesWindow() {
  const initial = new URLSearchParams(location.search).get("tab");
  const [tab, setTab] = useState<Tab>(TABS.includes(initial as Tab) ? initial as Tab : "general");
  const [value, setValue] = useState<FerShotAppPreferences>({ ...DEFAULT_APP_PREFERENCES, baseSettings: { ...DEFAULT_APP_PREFERENCES.baseSettings } });
  const [uploadingVisited,setUploadingVisited]=useState(initial==="uploading");
  useEffect(()=>{if(tab==="uploading")setUploadingVisited(true);},[tab]);
  const [ready, setReady] = useState(false);
  const [loginSupported, setLoginSupported] = useState(false);
  const [loginHint,setLoginHint]=useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeTone,setNoticeTone]=useState<StatusTone>("info");
  const mounted = useRef(false); const pending = useRef(false);
  const reducedMotion = useReducedMotion();
  const latest=useRef(value);
  const autosave=useSettingsAutosave<FerShotAppPreferences>(async snapshot=>{
    await saveApplicationPreferences(snapshot);
    if(mounted.current&&latest.current===snapshot){setNoticeTone("success");setNotice("Preferences saved.");}
  },reason=>{if(mounted.current){setNoticeTone("error");setNotice(reason instanceof Error?reason.message:"Preferences could not be saved. Change a setting to retry.");}});
  useEffect(() => {
    mounted.current = true; let live = true;
    document.title = "FerShot X — Settings";
    document.body.classList.add("preferences-page");
    void readApplicationPreferences().then(async loaded => {
      if (!live) return;
      let next = { ...loaded };
      if (supportsNativeOutput()) {
        try { const login = await readLoginState(); if (live) { setLoginSupported(login.supported); setLoginHint(login.supported?"":"Launch at startup requires the installed FerShot X.app. It is unavailable in browser previews and unbundled development runs."); next = { ...next, launchAtLogin: login.enabled }; } } catch { if(live)setLoginHint("Startup status could not be read. Retry to reconnect to the login service."); }
      }
      if (live) { latest.current=next; setValue(next); setReady(true); }
    }).catch(() => { if (live){setNoticeTone("error");setNotice("Saved preferences could not be loaded. Existing settings have been preserved; reopen Settings to retry.");} });
    let dispose: (() => void) | undefined;
    if (supportsNativeOutput()) void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const off = await listen<string>("fershot-preferences-tab", event => { if (live && TABS.includes(event.payload as Tab)) setTab(event.payload as Tab); });
      if (live) dispose = off; else off();
    }).catch(() => {});
    return () => { live = false; mounted.current = false; dispose?.(); document.body.classList.remove("preferences-page"); };
  }, []);
  async function run(operation: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setNotice("");
    try { await operation(); }
    catch (reason) { if (mounted.current) {setNoticeTone("error");setNotice(reason instanceof Error ? reason.message : "The preference could not be saved. Please retry.");} }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  function update(next:FerShotAppPreferences,persist=true){latest.current=next;setValue(next);if(persist&&ready){setNotice("");autosave.schedule(next);}}
  function patch<K extends keyof FerShotAppPreferences>(key: K, next: FerShotAppPreferences[K],persist=true) { update({...latest.current,[key]:next},persist); }
  function setBase<K extends keyof FerShotAppPreferences["baseSettings"]>(key: K, next: FerShotAppPreferences["baseSettings"][K]) {
    update({...latest.current,baseSettings:{...latest.current.baseSettings,[key]:next}});
  }
  function nativeToggle(key: "showInMenuBar" | "keepEditorAlwaysOnTop" | "launchAtLogin", enabled: boolean) {
    void run(async () => {
      await autosave.flush();
      await serializeSettingsWrite(async()=>{
      if (key === "showInMenuBar") await setMenuBarIcon(enabled);
      else if (key === "keepEditorAlwaysOnTop") await setWorkspaceOnTop(enabled);
      else enabled = await setLaunchAtLogin(enabled);
      });
      if (mounted.current) patch(key, enabled);
    });
  }
  return <Tabs value={tab} onValueChange={next => setTab(next as Tab)} asChild><main className="preferences-window">
    <WindowTitleBar section="Settings"/>
    <TabsList aria-label="Settings sections" className="preferences-tabs">
      {TABS.map(item => <TabsTrigger key={item} value={item} id={`tab-${item}`} aria-controls={`pane-${item}`}><TabIcon tab={item}/><span>{TITLES[item]}</span></TabsTrigger>)}
    </TabsList>
    <motion.div className="preferences-content" initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: reducedMotion ? 0 : 0.12}}>
      {noticeTone==="error"&&notice&&<StatusMessage tone="error" className="preferences-error">{notice}</StatusMessage>}
      <section role="tabpanel" id="pane-general" aria-labelledby="tab-general" hidden={tab !== "general"}>
        <fieldset aria-label="Capture & export" disabled={!ready || busy}><h3 className="preference-section-title">Capture & export</h3>
          <div className="preference-row"><span>Save format</span><div role="radiogroup" aria-label="Preferred export format" className="preference-segment">
            {(["png", "jpeg"] as const).map(format => <label key={format}><Radio name="save-format" checked={value.baseSettings.saveFormat === format} onChange={() => setBase("saveFormat", format)} />{format.toUpperCase()}</label>)}
          </div></div>
          <label className="preference-row"><span>JPEG quality</span><div className="preference-range"><Slider aria-label="Preferred JPEG quality"  min="1" max="100" value={value.baseSettings.jpegQuality} onValueChange={sliderValue => setBase("jpegQuality", Number(sliderValue))}/><output>{value.baseSettings.jpegQuality}%</output></div></label>
          <CheckboxField checked={value.baseSettings.downscaleRetina} onCheckedChange={enabled => setBase("downscaleRetina", enabled)} aria-label="Downscale Retina captures to 1× when copying or saving" label="Downscale Retina to 1×"/>
          
        </fieldset>
        <ScrollCaptureSettings/>
        <WorkspaceDestination busy={busy} run={run}/>
        <fieldset aria-label="Application" disabled={!ready || busy}><h3 className="preference-section-title">Application</h3>
          <CheckboxField className="startup-checkbox-field" label="Launch at startup" aria-label="Launch at startup" aria-description={!loginSupported?loginHint:undefined} disabled={!loginSupported || busy} checked={value.launchAtLogin} onCheckedChange={enabled=>nativeToggle("launchAtLogin",enabled)} action={!loginSupported&&ready&&supportsNativeOutput()?<ToolHint label="Retry Startup Status"><Button className="settings-inline-icon" icon={RefreshCw} aria-label="Retry startup status" variant="plain" size="icon" disabled={busy} onClick={()=>void run(async()=>{const state=await readLoginState();setLoginSupported(state.supported);patch("launchAtLogin",state.enabled,false);setLoginHint(state.supported?"":"Launch at startup requires the installed FerShot X.app.");})}/></ToolHint>:undefined}/>
          <CheckboxField checked={value.showInMenuBar} onCheckedChange={enabled => nativeToggle("showInMenuBar", enabled)} label="Show menu bar icon"/>
          <CheckboxField checked={value.showSystemNotifications} onCheckedChange={enabled => patch("showSystemNotifications", enabled)} aria-label="Notify when a capture is ready" label="Capture notifications"/>
        </fieldset>
      </section>
      <section role="tabpanel" id="pane-hotkeys" aria-labelledby="tab-hotkeys" hidden={tab !== "hotkeys"}>{tab === "hotkeys" && <WorkspaceShortcuts blocked={busy}/>}</section>
      <section role="tabpanel" id="pane-uploading" aria-labelledby="tab-uploading" hidden={tab !== "uploading"}>{uploadingVisited&&<WorkspaceFtpSettings/>}</section>
      <section role="tabpanel" id="pane-advanced" aria-labelledby="tab-advanced" hidden={tab !== "advanced"}>
        <fieldset aria-label="Editor" disabled={!ready || busy}><h3 className="preference-section-title">Editor</h3>
          <label className="preference-row"><span>Default zoom</span><div className="preference-range"><Slider aria-label="Default zoom"  min="25" max="400" step="25" value={value.defaultZoomPercent} onValueChange={sliderValue => patch("defaultZoomPercent", Number(sliderValue))}/><output>{value.defaultZoomPercent}%</output></div></label>
          <CheckboxField checked={value.keepEditorAlwaysOnTop} onCheckedChange={enabled => nativeToggle("keepEditorAlwaysOnTop", enabled)} aria-label="Keep the editor above other windows" label="Keep editor on top"/>
        </fieldset>
        <LogSettings/>
        
      </section>
      <section role="tabpanel" id="pane-updates" aria-labelledby="tab-updates" hidden={tab!=="updates"}><UpdateSettings/></section>
    </motion.div>
  </main></Tabs>;
}
