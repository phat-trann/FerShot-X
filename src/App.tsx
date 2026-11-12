import {lazy,Suspense} from "react";
import "./Workspace.css";
import {UpdaterHost} from "./features/updater/Updater";
const LibraryWindow=lazy(()=>import("./LibraryWindow"));
const Workspace=lazy(()=>import("./Workspace"));
const PreferencesWindow=lazy(()=>import("./PreferencesWindow"));
export default function App(){const route=new URLSearchParams(window.location.search);return <Suspense fallback={<div className="window-loading" role="status" aria-label="Loading window"/>}>{route.has("preferences")?<PreferencesWindow/>:route.has("editor")?<><UpdaterHost/><Workspace/></>:<LibraryWindow/>}</Suspense>;}
