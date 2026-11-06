import { useEffect, useRef, useState } from "react";
import { LifecyclePolicy, type ApplicationAction, type LifecycleContext } from "./features/lifecycle-policy";
import { acknowledgeDeepLink, listenForDeepLinks, readPendingDeepLinks, readLinkPolicy, saveLinkPolicy, supportsNativeOutput, type PendingDeepLink } from "./platform/native";
import type { CaptureMode } from "./contracts/media";

interface Confirmation { entry: PendingDeepLink; token: string; action: ApplicationAction; documentId: string | null; revision: number }
export function WorkspaceDeepLinks({ context, onCapture, onEditor }: {
  context: LifecycleContext; onCapture: (mode: CaptureMode) => void; onEditor: (id: string) => void;
}) {
  const [queue, setQueue] = useState<readonly PendingDeepLink[]>([]);
  const [pending, setPending] = useState<Confirmation | null>(null);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [policyReady, setPolicyReady] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const policyWrite = useRef(false);
  const policy = useRef<LifecyclePolicy | null>(null);
  const current = useRef(context); current.current = context;
  const handled = useRef(new Set<string>());
  useEffect(() => {
    let active = true;
    void readLinkPolicy().then(value => { if (active) setEnabled(value); })
      .catch(() => { if (active) setError("Saved link policy could not be loaded; external actions are disabled."); })
      .finally(() => { if (active) setPolicyReady(true); });
    return () => { active = false; };
  }, []);
  async function changePolicy(next: boolean) {
    if (policyWrite.current || context.busy || !policyReady) return;
    policyWrite.current = true; setSavingPolicy(true);
    try { setEnabled(await saveLinkPolicy(next)); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Link policy could not be saved."); }
    finally { policyWrite.current = false; setSavingPolicy(false); }
  }
  function acknowledge(id: string) {
    handled.current.add(id);
    if (handled.current.size > 256) handled.current.delete(handled.current.values().next().value!);
    void acknowledgeDeepLink(id).catch(() => setError("Link action resolved, but native acknowledgement failed."));
  }
  useEffect(() => {
    let active = true; let dispose: (() => void) | undefined; let again = false; let reading = false;
    async function receive() {
      if (!active) return;
      if (reading) { again = true; return; }
      reading = true;
      try {
        do {
          again = false;
          const entries = await readPendingDeepLinks();
          if (active && entries.length) setQueue(previous => [...previous, ...entries.filter(entry => !handled.current.has(entry.id) && !previous.some(old => old.id === entry.id))].slice(0, 16));
        } while (active && again);
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : "Deep links unavailable."); }
      finally { reading = false; }
    }
    // Subscribe before draining links received during cold start.
    void listenForDeepLinks(() => { void receive(); }).then(unlisten => {
      if (!active) { unlisten(); return; } dispose = unlisten; void receive();
    }).catch(() => { if (active) setError("Deep-link listener unavailable."); });
    return () => { active = false; dispose?.(); };
  }, []);

  useEffect(() => {
    if (!policyReady) return;
    if (!enabled) {
      policy.current = null;
      if (pending) setPending(null);
      if (queue.length) { for (const entry of queue) acknowledge(entry.id); setQueue([]); }
      return;
    }
    if (pending) {
      if (pending.documentId !== context.documentId || pending.revision !== context.revision) {
        policy.current = null; setPending(null);
      }
      return;
    }
    if (!queue.length || context.busy || savingPolicy) return;
    const entry = queue[0];
    const next = new LifecyclePolicy({ capture: ["fullscreen", "area", "window"], tools: [], editor: true, save: false,
      print: false, show: false, close: false }, { confirmCleanClose: false });
    next.setContext(current.current);
    const decision = next.handle({ id: entry.id, kind: "deep-link", url: entry.url });
    const effect = decision.effects.find(item => item.kind === "confirm-external");
    if (effect?.kind === "confirm-external") {
      policy.current = next; setPending({ entry, token: effect.token, action: effect.action, documentId: context.documentId, revision: context.revision });
    } else { setError("Link rejected: unsupported route or image is unavailable in this session."); acknowledge(entry.id); setQueue(previous => previous.slice(1)); }
  }, [queue, pending, context.busy, context.documentId, context.revision, enabled, policyReady, savingPolicy]);

  function resolve(accept: boolean) {
    if (!pending || !policy.current || current.current.busy || !enabled || !policyReady || policyWrite.current) return;
    policy.current.setContext(current.current);
    const decision = policy.current.confirm(pending.token, accept ? "accept" : "cancel");
    setPending(null); setQueue(previous => previous.filter(entry => entry.id !== pending.entry.id));
    policy.current = null;
    acknowledge(pending.entry.id);
    if (!decision.accepted) { setError("Workspace changed; link action cancelled."); return; }
    setError("");
    for (const effect of decision.effects) if (effect.kind === "action") {
      if (effect.action.kind === "capture") onCapture(effect.action.mode);
      else if (effect.action.kind === "editor") onEditor(effect.action.imageId);
    }
  }

  return <><details><summary>External Ferby links</summary><label><input type="checkbox" checked={enabled}
    disabled={!policyReady || savingPolicy || context.busy || !supportsNativeOutput()} onChange={event => { void changePolicy(event.target.checked); }} />Allow Ferby links</label>
    <p>Capture and editor links always require confirmation. Disabling this discards queued link actions and is saved for the next launch.</p></details>
  {enabled && pending && <section role="alertdialog" aria-label="Confirm external Ferby link">
    <p>{pending.action.kind === "capture" ? `Capture ${pending.action.mode} from an external link?` : "Open the requested session image in the editor?"}</p>
    <p>{pending.entry.url}</p><button disabled={context.busy} onClick={() => resolve(true)}>Allow link action</button>
    <button disabled={context.busy} onClick={() => resolve(false)}>Dismiss link</button>
  </section>}{error && <p role="alert">{error}</p>}</>;
}
