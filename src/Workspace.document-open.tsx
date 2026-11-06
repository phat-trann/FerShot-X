import { useEffect, useRef, useState } from "react";
import { acknowledgeOpenedDocument, listenOpenedDocuments, readOpenedDocuments, type OpenedDocument } from "./platform/native";

export function WorkspaceDocumentOpen({ busy, run, onOpen }: {
  busy: boolean; run: (operation: () => Promise<void>) => Promise<void>; onOpen: (id: string) => Promise<void>;
}) {
  const [pending, setPending] = useState<readonly OpenedDocument[]>([]);
  const [error, setError] = useState("");
  const handled = useRef(new Set<string>());
  const processing = useRef(false);
  const alive = useRef(true);
  const current = useRef({ busy, run, onOpen }); current.current = { busy, run, onOpen };
  useEffect(() => {
    alive.current = true; let active = true; let unlisten: (() => void) | undefined;
    async function receive() {
      try { const values = await readOpenedDocuments(); if (active) setPending(previous => [...previous,
        ...values.filter(value => !handled.current.has(value.id) && !previous.some(old => old.id === value.id))].slice(0, 16)); }
      catch (reason) { if (active) setError(reason instanceof Error ? reason.message : "Document requests unavailable."); }
    }
    void listenOpenedDocuments(() => { void receive(); }).then(dispose => {
      if (!active) { dispose(); return; } unlisten = dispose; void receive();
    }).catch(() => { if (active) setError("Native document listener unavailable."); });
    return () => { active = false; alive.current = false; unlisten?.(); };
  }, []);
  useEffect(() => {
    if (!pending.length || busy || processing.current) return;
    const entry = pending[0]; processing.current = true;
    void current.current.run(async () => {
      if (handled.current.has(entry.id)) return;
      try { await current.current.onOpen(entry.id); }
      catch (reason) { if (alive.current) setError(`${entry.name}: ${reason instanceof Error ? reason.message : "Could not open image."}`); }
      finally {
        handled.current.add(entry.id);
        if (handled.current.size > 256) handled.current.delete(handled.current.values().next().value!);
        try { await acknowledgeOpenedDocument(entry.id); }
        catch { if (alive.current) setError("Image request resolved, but acknowledgement failed."); }
        if (alive.current) setPending(previous => previous.filter(value => value.id !== entry.id));
      }
    }).finally(() => { processing.current = false; });
  }, [pending, busy]);
  return error ? <p role="alert">{error}</p> : null;
}
