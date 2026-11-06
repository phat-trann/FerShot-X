import { useEffect, useRef, useState } from "react";
import { ArchivePanel } from "./features/archive-panel";
import type { ArchiveLibrary, ArchiveWorkflow } from "./features/archive-workflow";
import { createLocalArchiveWorkflow } from "./platform/archive";

export function WorkspaceArchive({ imageCount, blocked, snapshot, commit, run }: {
  imageCount: number; blocked: boolean; snapshot: () => ArchiveLibrary;
  commit: (candidate: ArchiveLibrary, expectedRevision: number) => boolean;
  run: (operation: () => Promise<void>) => Promise<void>;
}) {
  const props = useRef({ snapshot, commit }); props.current = { snapshot, commit };
  const workflow = useRef<ArchiveWorkflow | null>(null);
  const active = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; workflow.current?.cancel(); }; }, []);

  function start(kind: "import" | "export") {
    if (active.current || blocked) return;
    active.current = true; setBusy(true); setStatus(null); setError(null);
    const current = createLocalArchiveWorkflow((candidate, revision) => mounted.current && props.current.commit(candidate, revision));
    workflow.current = current;
    void run(async () => {
      try {
        const before = props.current.snapshot();
        const result = kind === "import" ? (await current.importInto(before)).status : await current.exportFrom(before);
        if (mounted.current) setStatus(result === "committed" ? "Archive added; existing images and edits preserved." : result === "saved" ? "Archive exported with source bytes and editable annotations." : result === "conflict" ? "Session changed; import was not committed. Try again." : "Archive operation cancelled.");
      } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : "Archive operation failed."); }
    }).finally(() => { active.current = false; if (mounted.current) setBusy(false); });
  }

  return <div>
    <ArchivePanel imageCount={imageCount} busy={busy || blocked} status={status} error={error}
      onImport={() => start("import")} onExport={() => start("export")} onCancel={() => workflow.current?.cancel()} />
    <p>Portable Ferby archive, up to 64 images and 64 MiB including annotations. Choose a new export filename; existing files are preserved. Cancellation waits for an open native dialog to close. This format does not import Shottr data.</p>
  </div>;
}
