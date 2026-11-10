import { WindowTitleBar } from "./components/WindowTitleBar";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_APP_PREFERENCES, type FerShotAppPreferences } from "./features/app-preferences";
import { readApplicationPreferences, saveApplicationPreferences, readLoginState, setLaunchAtLogin, setMenuBarIcon, setWorkspaceOnTop, supportsNativeOutput } from "./platform/native";
import { closePreferencesWindow } from "./platform/preferences-window";
import { WorkspaceFtpSettings } from "./Workspace.ftp";
import { WorkspaceDestination } from "./Workspace.destination";
import { WorkspaceShortcuts } from "./Workspace.shortcuts";
import { Settings2, Keyboard, CloudUpload, SlidersHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "./components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Switch } from "./components/ui/switch";
import { LogSettings } from "./Workspace.logs";
import "./PreferencesWindow.css";
import { Slider } from "./components/ui/slider";

const TABS = ["general", "hotkeys", "uploading", "advanced"] as const;
type Tab = typeof TABS[number];
const TITLES: Record<Tab, string> = { general: "General", hotkeys: "Hotkeys", uploading: "Uploading", advanced: "Advanced" };
const TAB_ICONS = { general: Settings2, hotkeys: Keyboard, uploading: CloudUpload, advanced: SlidersHorizontal };
function TabIcon({tab}: {tab: Tab}) { const Icon = TAB_ICONS[tab]; return <Icon size={24} strokeWidth={1.6} aria-hidden="true"/>; }

export default function PreferencesWindow() {
  const initial = new URLSearchParams(location.search).get("tab");
  const [tab, setTab] = useState<Tab>(TABS.includes(initial as Tab) ? initial as Tab : "general");
  const [value, setValue] = useState<FerShotAppPreferences>({ ...DEFAULT_APP_PREFERENCES, baseSettings: { ...DEFAULT_APP_PREFERENCES.baseSettings } });
  const [ready, setReady] = useState(false);
  const [loginSupported, setLoginSupported] = useState(false);
  const [loginHint,setLoginHint]=useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const mounted = useRef(false); const pending = useRef(false);
  const reducedMotion = useReducedMotion();
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
      if (live) { setValue(next); setReady(true); }
    }).catch(() => { if (live) setNotice("Saved preferences could not be loaded. Existing settings have been preserved; reopen Settings to retry."); });
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
    catch (reason) { if (mounted.current) setNotice(reason instanceof Error ? reason.message : "The preference could not be saved. Please retry."); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  function patch<K extends keyof FerShotAppPreferences>(key: K, next: FerShotAppPreferences[K]) { setValue(old => ({ ...old, [key]: next })); }
  function setBase<K extends keyof FerShotAppPreferences["baseSettings"]>(key: K, next: FerShotAppPreferences["baseSettings"][K]) {
    setValue(old => ({ ...old, baseSettings: { ...old.baseSettings, [key]: next } }));
  }
  function nativeToggle(key: "showInMenuBar" | "keepEditorAlwaysOnTop" | "launchAtLogin", enabled: boolean) {
    void run(async () => {
      if (key === "showInMenuBar") await setMenuBarIcon(enabled);
      else if (key === "keepEditorAlwaysOnTop") await setWorkspaceOnTop(enabled);
      else enabled = await setLaunchAtLogin(enabled);
      if (mounted.current) patch(key, enabled);
    });
  }
  function save() { if (ready) void run(async () => { const saved = await saveApplicationPreferences(value); if (mounted.current) { setValue({ ...saved }); setNotice("Preferences saved."); } }); }
  return <Tabs value={tab} onValueChange={next => setTab(next as Tab)} asChild><main className="preferences-window">
    <WindowTitleBar section="Settings"/>
    <TabsList aria-label="Settings sections" className="preferences-tabs">
      {TABS.map(item => <TabsTrigger key={item} value={item} id={`tab-${item}`} aria-controls={`pane-${item}`}><TabIcon tab={item}/><span>{TITLES[item]}</span></TabsTrigger>)}
    </TabsList>
    <motion.div className="preferences-content" initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: reducedMotion ? 0 : 0.12}}>
      <section role="tabpanel" id="pane-general" aria-labelledby="tab-general" hidden={tab !== "general"}>
        <fieldset disabled={!ready || busy}><legend>Capture &amp; export</legend>
          <div className="preference-row"><span>Save format</span><div role="radiogroup" aria-label="Preferred export format" className="preference-segment">
            {(["png", "jpeg"] as const).map(format => <label key={format}><input type="radio" name="save-format" checked={value.baseSettings.saveFormat === format} onChange={() => setBase("saveFormat", format)} />{format.toUpperCase()}</label>)}
          </div></div>
          <label className="preference-row"><span>JPEG quality</span><div className="preference-range"><Slider aria-label="Preferred JPEG quality"  min="1" max="100" value={value.baseSettings.jpegQuality} onValueChange={sliderValue => setBase("jpegQuality", Number(sliderValue))}/><output>{value.baseSettings.jpegQuality}%</output></div></label>
          <label className="preference-check"><Switch checked={value.baseSettings.downscaleRetina} onCheckedChange={enabled => setBase("downscaleRetina", enabled)}/>Downscale Retina captures to 1× when copying or saving</label>
          <p className="preference-help">New captures open in the editor. Imported images keep their original pixel size.</p>
        </fieldset>
        <WorkspaceDestination expanded busy={busy} run={run}/>
        <fieldset disabled={!ready || busy}><legend>Application</legend>
          <label className="preference-check"><Switch aria-label="Launch at startup" aria-describedby={!loginSupported?"startup-help":undefined} disabled={!loginSupported || busy} checked={value.launchAtLogin} onCheckedChange={enabled => nativeToggle("launchAtLogin", enabled)}/>Launch at startup</label>
          {!loginSupported&&ready&&<div className="startup-help"><p id="startup-help" className="preference-help">{loginHint||"Launch at startup is available in the installed macOS app."}</p>{supportsNativeOutput()&&<Button variant="ghost" size="sm" disabled={busy} onClick={()=>void run(async()=>{const state=await readLoginState();setLoginSupported(state.supported);patch("launchAtLogin",state.enabled);setLoginHint(state.supported?"":"Launch at startup requires the installed FerShot X.app. It is unavailable in unbundled development runs.");})}>Retry startup status</Button>}</div>}
          <label className="preference-check"><Switch checked={value.showInMenuBar} onCheckedChange={enabled => nativeToggle("showInMenuBar", enabled)}/>Show menu bar icon</label>
          <label className="preference-check"><Switch checked={value.showSystemNotifications} onCheckedChange={enabled => patch("showSystemNotifications", enabled)}/>Notify when a capture is ready</label>
        </fieldset>
      </section>
      <section role="tabpanel" id="pane-hotkeys" aria-labelledby="tab-hotkeys" hidden={tab !== "hotkeys"}>{tab === "hotkeys" && <WorkspaceShortcuts blocked={busy}/>}</section>
      <section role="tabpanel" id="pane-uploading" aria-labelledby="tab-uploading" hidden={tab !== "uploading"}><WorkspaceFtpSettings expanded/></section>
      <section role="tabpanel" id="pane-advanced" aria-labelledby="tab-advanced" hidden={tab !== "advanced"}>
        <fieldset disabled={!ready || busy}><legend>Editor</legend>
          <label className="preference-row"><span>Default zoom</span><div className="preference-range"><Slider aria-label="Default zoom"  min="25" max="400" step="25" value={value.defaultZoomPercent} onValueChange={sliderValue => patch("defaultZoomPercent", Number(sliderValue))}/><output>{value.defaultZoomPercent}%</output></div></label>
          <label className="preference-check"><Switch checked={value.keepEditorAlwaysOnTop} onCheckedChange={enabled => nativeToggle("keepEditorAlwaysOnTop", enabled)}/>Keep the editor above other windows</label>
        </fieldset>
        <LogSettings/>
        <div className="preference-info"><strong>Private by default</strong><p>Local copies expire after 30 days. FTP transfers start only when you choose Upload or Retry. Passwords stay in macOS Keychain.</p></div>
      </section>
    </motion.div>
    <footer className="preferences-footer"><p role="status">{notice || "Preferences are stored on this Mac."}</p><div>
      <Button variant="outline" size="sm" onClick={() => { void closePreferencesWindow().catch(() => setNotice("Settings could not be closed. Use the window close button.")); }}>Done</Button>
      {(tab === "general" || tab === "advanced") && <Button size="sm" className="preferences-save" disabled={!ready || busy || !supportsNativeOutput()} onClick={save}>{busy ? "Saving…" : "Save preferences"}</Button>}
    </div></footer>
  </main></Tabs>;
}
