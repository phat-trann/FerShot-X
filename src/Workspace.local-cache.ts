import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalDraft } from "./contracts/local-draft";
import type { ImageDocument } from "./contracts/media";
import { localCacheAvailable, removeLocalCache, saveLocalDraft } from "./platform/local-cache";

export function useLocalHistory() {
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
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const revisions=useRef(new Map<string,number>());
  const snapshots=useRef(new Map<string,{src:string;name:string;draft:LocalDraft}>());
  const remember = useCallback((image: ImageDocument, draft:LocalDraft=image.draft??{schemaVersion:1,width:image.width,height:image.height,annotations:[],advanced:[]}): Promise<void> => {
    const id=image.localId??image.id;
    if(!activeVersions.current.has(id))activeVersions.current.set(id,image.id);
    if(activeVersions.current.get(id)!==image.id)return Promise.resolve();
    if (!localCacheAvailable() || forgotten.current.has(id)) return Promise.resolve();
    const revision=(revisions.current.get(id)??0)+1;revisions.current.set(id,revision);
    const next = run(async () => {
      if (forgotten.current.has(id)||activeVersions.current.get(id)!==image.id||revisions.current.get(id)!==revision) return;
      const previous=snapshots.current.get(id);
      if(previous?.src===image.src&&previous.name===image.name&&previous.draft.width===draft.width&&previous.draft.height===draft.height&&previous.draft.annotations===draft.annotations&&previous.draft.advanced===draft.advanced)return;
      await saveLocalDraft(image,draft,savedPixels.current.get(id)!==image.src).catch(error=>{savedPixels.current.delete(id);snapshots.current.delete(id);throw error;});
      savedPixels.current.set(id,image.src);
      snapshots.current.set(id,{src:image.src,name:image.name,draft});
      if(alive.current)setError("");
    });
    pending.current.set(id, next);
    void next.finally(() => { if (pending.current.get(id) === next) pending.current.delete(id); });
    return (async()=>{let waiting=next;for(;;){await waiting;const latest=pending.current.get(id);if(!latest||latest===waiting)return;waiting=latest;}})();
  }, [run]);
  const forget = useCallback((id: string) => {
    if(removed.current.has(id))return Promise.resolve();
    const existing=removals.current.get(id);if(existing)return existing;
    forgotten.current.add(id);
    const next=run(async () => {
      if (localCacheAvailable()) {await removeLocalCache(id);removed.current.add(id);}
    });
    removals.current.set(id,next);
    void next.finally(()=>{if(removals.current.get(id)===next)removals.current.delete(id);});
    return next;
  }, [run]);
  return {error,remember,activate,forget,pending:(id:string)=>pending.current.get(id)??Promise.resolve()};
}
