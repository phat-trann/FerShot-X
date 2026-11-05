import Workspace from "./Workspace";
import PinnedWorkspace from "./Workspace.pin";
export default function App() {
  return new URLSearchParams(window.location.search).has("pin") ? <PinnedWorkspace /> : <Workspace />;
}
