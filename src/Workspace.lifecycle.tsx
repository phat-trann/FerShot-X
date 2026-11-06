import { useEffect, useRef, useState } from "react";
import { LifecyclePolicy } from "./features/lifecycle-policy";
import type { LifecycleContext } from "./features/lifecycle-policy";
import { closeWorkspace, listenForWorkspaceClose, setWorkspaceOnTop } from "./platform/native";

export function WorkspaceLifecycle({ context, onTop: controlledOnTop, onTopChanged }: {
  context: LifecycleContext; onTop?: boolean; onTopChanged?: (value: boolean) => void;
}) {
  const policy = useRef<LifecyclePolicy | null>(null);
  if (!policy.current) policy.current = new LifecyclePolicy({ capture: [], tools: [], save: false,
    print: false, show: false, close: true, editor: false }, { confirmCleanClose: true });
  const currentContext = useRef(context); currentContext.current = context;
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [localOnTop, setOnTop] = useState(false);
  const onTop = controlledOnTop ?? localOnTop;
  const [pending, setPending] = useState(false);
  const operation = useRef(false);
  const mounted = useRef(true);
  const sequence = useRef(0);

  function syncContext() { policy.current!.setContext(currentContext.current); }
  function requestClose() {
    if (operation.current) return;
    syncContext();
    const result = policy.current!.handle({ id: `close-${++sequence.current}`, kind: "action", origin: "button", action: { kind: "close" } });
    if (!result.accepted) {
      if (result.reason === "busy") setError("Finish or cancel the current operation before closing.");
      return;
    }
    const effect = result.effects.find(item => item.kind === "confirm-close");
    if (effect?.kind === "confirm-close") { setError(""); setConfirmation(effect.token); }
  }
  const request = useRef(requestClose); request.current = requestClose;

  useEffect(() => {
    mounted.current = true;
    let active = true;
    let unlisten: (() => void) | undefined;
    void listenForWorkspaceClose(() => { if (active) request.current(); }).then(dispose => {
      if (active) unlisten = dispose; else dispose();
    }).catch(() => { if (active) setError("Window-close listener unavailable. Use Close workspace below."); });
    return () => { active = false; mounted.current = false; unlisten?.(); };
  }, []);

  useEffect(() => {
    syncContext();
    if (confirmation && policy.current!.state.pendingToken !== confirmation) setConfirmation(null);
  }, [context.documentId, context.revision, context.busy, context.dirty, confirmation]);

  async function confirmClose() {
    if (!confirmation || operation.current) return;
    syncContext();
    const result = policy.current!.confirm(confirmation, "discard");
    if (!result.accepted) { setConfirmation(null); setError("The workspace changed or is busy. Request close again."); return; }
    if (!result.effects.some(effect => effect.kind === "action" && effect.action.kind === "close")) return;
    operation.current = true; setPending(true);
    try { await closeWorkspace(); }
    catch (reason) {
      policy.current!.resolveClose(false);
      if (mounted.current) { setConfirmation(null); setError(reason instanceof Error ? reason.message : "Unable to close workspace."); }
    } finally { operation.current = false; if (mounted.current) setPending(false); }
  }

  function cancelClose() {
    if (!confirmation || operation.current) return;
    policy.current!.confirm(confirmation, "cancel"); setConfirmation(null);
  }

  async function toggleOnTop() {
    if (operation.current || currentContext.current.busy) return;
    operation.current = true; setPending(true); setError("");
    const next = !onTop;
    try { await setWorkspaceOnTop(next); if (mounted.current) { setOnTop(next); onTopChanged?.(next); } }
    catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : "Unable to change window mode."); }
    finally { operation.current = false; if (mounted.current) setPending(false); }
  }

  return <section aria-label="Workspace window controls">
    <button disabled={pending || context.busy} aria-pressed={onTop} onClick={() => { void toggleOnTop(); }}>Keep workspace on top (this session)</button>
    <button disabled={pending || context.busy} onClick={requestClose}>Close workspace</button>
    {confirmation && <div role="alertdialog" aria-modal="false" aria-label="Confirm workspace close">
      <p>{context.imageIds.length ? "Closing discards all images and editable annotations in this session. Saved files remain on disk." : "Close this workspace window?"}</p>
      <button disabled={pending || context.busy} onClick={() => { void confirmClose(); }}>Close and discard session</button>
      <button disabled={pending} onClick={cancelClose}>Keep workspace open</button>
    </div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
