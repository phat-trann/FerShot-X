import { useEffect, useRef, useState, type PointerEvent } from "react";
import { discardPreparedDrag, startPreparedDrag } from "./platform/native";

export function WorkspaceDrag({ busy, prepare, run }: {
  busy: boolean; prepare: () => Promise<string>; run: (operation: () => Promise<void>) => Promise<void>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const owned = useRef<string | null>(null);
  const mounted = useRef(true);
  const pending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (owned.current) void discardPreparedDrag(owned.current).catch(() => {}); };
  }, []);

  function prepareExport() {
    if (busy || pending.current) return;
    pending.current = true; setNotice("");
    void run(async () => {
      const next = await prepare();
      if (!mounted.current) { await discardPreparedDrag(next); return; }
      owned.current = next; setToken(next); setNotice("PNG export ready. Press and drag the prepared image to its destination.");
    }).finally(() => { pending.current = false; });
  }

  function begin(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary || !token || busy || pending.current) return;
    event.preventDefault();
    const current = token; pending.current = true;
    void run(async () => {
      try {
        const dropped = await startPreparedDrag(current);
        if (mounted.current) setNotice(dropped ? "Native drag completed." : "Drag cancelled; the source image is unchanged.");
      } finally {
        await discardPreparedDrag(current);
        owned.current = null;
        if (mounted.current) setToken(null);
      }
    }).finally(() => { pending.current = false; });
  }

  return <section aria-label="Native PNG file drag">
    <button type="button" disabled={busy} onClick={prepareExport}>{token ? "Refresh prepared PNG" : "Prepare PNG for drag"}</button>
    <button type="button" disabled={busy || !token} onPointerDown={begin} onDragStart={event => event.preventDefault()}>Drag prepared PNG</button>
    <p>The prepared PNG includes current edits and output scaling. Drop it into Finder or another application to copy it there.</p>
    {notice && <p role="status">{notice}</p>}
  </section>;
}
