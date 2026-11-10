import { useEffect, useRef, useState } from "react";
import { ExportDestinationPanel, validateBasename } from "./features/export-destination-panel";
import { chooseExportDirectory, readExportDestination, supportsNativeOutput, updateExportDestination, type ExportDestination } from "./platform/native";

export function WorkspaceDestination({ busy, run, expanded = false }: { busy: boolean; run: (operation: () => Promise<void>) => Promise<void>; expanded?: boolean }) {
  const [value, setValue] = useState<ExportDestination>({ folderLabel: null, basename: "Capture" });
  const [basename, setBasename] = useState("Capture");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    void readExportDestination().then(next => { if (alive.current) { setValue(next); setBasename(next.basename); setReady(true); } })
      .catch(() => { if (alive.current) setNotice("Export destination could not be read. Existing preferences were preserved."); });
    return () => { alive.current = false; };
  }, []);
  function apply(operation: () => Promise<ExportDestination>) {
    void run(async () => { const next = await operation(); if (alive.current) { setValue(next); setNotice("Export destination saved."); } });
  }
  return <details open={expanded || undefined} className="preference-controls"><summary>Save destination</summary><div className="preference-popover">
    <ExportDestinationPanel folderLabel={value.folderLabel} defaultBasename={basename} busy={busy || !ready || !supportsNativeOutput()}
      onBasenameChange={setBasename} onChooseFolder={() => apply(chooseExportDirectory)}
      onClearFolder={() => apply(() => updateExportDestination(null, true))} />
    <button disabled={busy || !ready || !!validateBasename(basename) || !supportsNativeOutput()} onClick={() => apply(() => updateExportDestination(basename, false))}>Save export name</button>
    <p>With a selected folder, Save writes a new numbered file there. Without a folder, Save asks for a destination. Existing files are never replaced.</p>
    {notice && <p role="status">{notice}</p>}
  </div></details>;
}
