import {lazy,Suspense} from "react";
import "./Workspace.css";
import "./styles/design-system.css";
import "./styles/macos.css";
import {useWindowAppearance} from "./use-window-appearance";
import {LoadingState} from "./components/ui/content-state";
import {UpdaterHost} from "./features/updater/Updater";
const LibraryWindow=lazy(()=>import("./LibraryWindow"));
const Workspace=lazy(()=>import("./Workspace"));
const PreferencesWindow=lazy(()=>import("./PreferencesWindow"));
export default function App(){useWindowAppearance();const route=new URLSearchParams(window.location.search);return <Suspense fallback={<div className="window-loading"><LoadingState>Loading window…</LoadingState></div>}>{route.has("preferences")?<PreferencesWindow/>:route.has("editor")?<><UpdaterHost/><Workspace/></>:<LibraryWindow/>}</Suspense>;}
