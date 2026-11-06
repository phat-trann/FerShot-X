import Workspace from "./Workspace";
import PinnedWorkspace from "./Workspace.pin";
import PrintWorkspace from "./Workspace.print";
export default function App() {
  const route = new URLSearchParams(window.location.search);
  return route.has("pin") ? <PinnedWorkspace /> : route.has("print") ? <PrintWorkspace /> : <Workspace />;
}
