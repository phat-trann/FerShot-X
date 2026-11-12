import {UpdaterHost} from "./features/updater/Updater";
import LibraryWindow from "./LibraryWindow";
import Workspace from "./Workspace";
import PreferencesWindow from "./PreferencesWindow";
export default function App() {
  const route = new URLSearchParams(window.location.search);
  return route.has("preferences") ? <PreferencesWindow /> : route.has("editor") ? <><UpdaterHost/><Workspace/></> : <><LibraryWindow/></>;
}
