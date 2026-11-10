import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalDraft } from "./contracts/local-draft";
import type { ImageDocument } from "./contracts/media";
import { cachedLibraryDocument, listLocalCache, localCacheAvailable, openLocalCache, removeLocalCache, saveLocalDraft, type CachedLocalEntry } from "./platform/local-cache";

export function useLocalHistory() {
  const [entries, setEntries] = useState<readonly CachedLocalEntry[]>([]);
  const [error, setError] = useState("");
  const alive = useRef(false);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const forgotten = useRef(new Set<string>());
  const removed = useRef(new Set<string>());
  const removals = useRef(new Map<string,Promise<void>>());
  const activeVersions=useRef(new Map<string,string>());
  const activate=useCallback((image:ImageDocument)=>{activeVersions.current.set(image.localId??image.id,image.id);},[]);
  const savedPixels = useRef(new Map<string,string>());
  const pending = useRef(new Map<string, Promise<void>>());
  const run = useCallback((operation: () => Promise<void>) => {
    const next = chain.current.then(operation).catch(() => {
      if (alive.current) setError("Local history could not be updated. Your original files are unchanged. Retry history to check stored copies.");
    });
    chain.current = next;
    return next;
  }, []);
  const refresh = useCallback(() => run(async () => {
    if (!localCacheAvailable()) return;
    const rows = await listLocalCache();
    if (alive.current) { setEntries(rows); setError(""); }
  }), [run]);
  useEffect(() => {
    alive.current = true; void refresh();
    // Prune expired rows in a long-running app as well as on restart/each operation.
    const timer = window.setInterval(() => { void refresh(); }, 60_000);
    return () => { alive.current = false; window.clearInterval(timer); };
  }, [refresh]);
  const remember = useCallback((image: ImageDocument, draft:LocalDraft=image.draft??{schemaVersion:1,width:image.width,height:image.height,annotations:[],advanced:[]}): Promise<void> => {
    const id=image.localId??image.id;
    if(!activeVersions.current.has(id))activeVersions.current.set(id,image.id);
    if(activeVersions.current.get(id)!==image.id)return Promise.resolve();
    if (!localCacheAvailable() || forgotten.current.has(id)) return Promise.resolve();
    const next = run(async () => {
      if (forgotten.current.has(id)||activeVersions.current.get(id)!==image.id) return;
      const saved = await saveLocalDraft(image,draft,savedPixels.current.get(id)!==image.src).catch(error=>{savedPixels.current.delete(id);throw error;});
      savedPixels.current.set(id,image.src);
      if (alive.current) {
        setEntries(rows => [saved, ...rows.filter(row => row.id !== saved.id)]);
        setError("");
      }
    });
    pending.current.set(id, next);
    void next.finally(() => { if (pending.current.get(id) === next) pending.current.delete(id); });
    return next;
  }, [run]);
  const forget = useCallback((id: string) => {
    if(removed.current.has(id))return Promise.resolve();
    const existing=removals.current.get(id);if(existing)return existing;
    forgotten.current.add(id);
    if (alive.current) setEntries(rows => rows.filter(row => row.id !== id));
    const next=run(async () => {
      if (localCacheAvailable()) {await removeLocalCache(id);removed.current.add(id);}
    });
    removals.current.set(id,next);
    void next.finally(()=>{if(removals.current.get(id)===next)removals.current.delete(id);});
    return next;
  }, [run]);
  const open = useCallback(async (id: string) => {
    const entry = entries.find(row => row.id === id);
    if (!entry) throw new Error("The cached image is no longer available. Refresh local history.");
    await chain.current;
    return openLocalCache(entry);
  }, [entries]);
  return { entries, error, remember, activate, forget, open, refresh,
    pending: (id: string) => pending.current.get(id) ?? Promise.resolve(),
    libraryDocuments: entries.map(cachedLibraryDocument) };
}
