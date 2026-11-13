import {serializeSettingsWrite,useSettingsAutosave} from "./use-settings-autosave";
import {StatusMessage,type StatusTone} from "./components/ui/status";
import { useEffect, useRef, useState } from "react";
import { ExportDestinationPanel, validateBasename } from "./features/export-destination-panel";
import { chooseExportDirectory, readExportDestination, supportsNativeOutput, updateExportDestination, type ExportDestination } from "./platform/native";

export function WorkspaceDestination({ busy, run }: { busy: boolean; run: (operation: () => Promise<void>) => Promise<void> }) {
  const [value, setValue] = useState<ExportDestination>({ folderLabel: null, basename: "Capture" });
  const [basename, setBasename] = useState("Capture");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [tone,setTone]=useState<StatusTone>("info");
  const alive = useRef(true),latestBasename=useRef(basename);
  const autosave=useSettingsAutosave<string>(async next=>{const saved=await updateExportDestination(next,false);if(alive.current&&latestBasename.current===next){setValue(saved);setTone("success");setNotice("Export destination saved.");}},error=>{if(alive.current){setTone("error");setNotice(error instanceof Error?error.message:"Export name could not be saved.");}});
  function changeBasename(next:string){latestBasename.current=next;setBasename(next);setNotice("");autosave.schedule(!validateBasename(next)?next:null);}
  useEffect(() => {
    alive.current = true;
    void readExportDestination().then(next => { if (alive.current) { setValue(next);latestBasename.current=next.basename; setBasename(next.basename); setReady(true); } })
      .catch(() => { if (alive.current){setTone("error");setNotice("Export destination could not be read. Existing preferences were preserved.");} });
    return () => { alive.current = false; };
  }, []);
  function apply(operation: () => Promise<ExportDestination>) {
    void run(async () => { await autosave.flush();const next = await serializeSettingsWrite(operation); if (alive.current) { setValue(next); setTone("success");setNotice("Export destination saved."); } });
  }
  return <section className="preference-controls" aria-label="Save destination"><h3 className="preference-section-title">Save destination</h3><div className="preference-popover">
    <ExportDestinationPanel folderLabel={value.folderLabel} defaultBasename={basename} busy={busy || !ready || !supportsNativeOutput()}
      onBasenameChange={changeBasename} onChooseFolder={() => apply(chooseExportDirectory)}
      onClearFolder={() => apply(() => updateExportDestination(null, true))} />
    {tone==="error"&&notice&&<StatusMessage tone={tone}>{notice}</StatusMessage>}
  </div></section>;
}
