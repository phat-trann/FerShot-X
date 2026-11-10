import { APP_VERSION } from "../app-info";
import { AppWindowTitle } from "./AppWindowTitle";
import "./WindowTitleBar.css";

export function WindowTitleBar({section}:{section:"Edit"|"Library"|"Settings"}){
 return <div className="window-titlebar editor-window-drag" data-tauri-drag-region="true" aria-label={`Move ${section} window`} title="FerShot X"><AppWindowTitle section={section}/><span className="window-titlebar-meta" aria-label="App version">v{APP_VERSION}</span></div>;
}
