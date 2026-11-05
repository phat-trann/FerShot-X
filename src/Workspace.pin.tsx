import { useEffect, useRef, useState } from "react";
import type { ImageDocument } from "./contracts/media";
import { PinPreviewCard } from "./features/pin/PinPreviewCard";
import { closePinnedImage, copyPinnedImage, editPinnedImage, readPinnedImage } from "./platform/native";
import "./Workspace.css";

export default function PinnedWorkspace() {
  const [document, setDocument] = useState<ImageDocument | null>(null);
  const [scale, setScale] = useState(1); const [opacity, setOpacity] = useState(1);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const active = useRef(true); const working = useRef(false);
  useEffect(() => {
    active.current = true; let current = true; let owned: ImageDocument | null = null;
    void readPinnedImage().then((value) => {
      if (!current) { URL.revokeObjectURL(value.src); return; }
      owned = value; setDocument(value);
    }).catch((reason) => { if (current) setError(reason instanceof Error ? reason.message : "Unable to open pinned image."); });
    return () => { current = false; active.current = false; if (owned) URL.revokeObjectURL(owned.src); };
  }, []);
  async function operate(operation: () => Promise<void>, success = "") {
    if (working.current) return;
    working.current = true; setBusy(true); setError(""); setNotice("");
    try { await operation(); if (active.current) setNotice(success); }
    catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : "Pin operation failed."); }
    finally { working.current = false; if (active.current) setBusy(false); }
  }
  return <main className="pinned-workspace">
    {error && <p role="alert">{error}</p>}
    {document ? <fieldset disabled={busy} className="editor-fieldset"><PinPreviewCard document={document}
      scale={scale} opacity={opacity} onScaleChange={setScale} onOpacityChange={setOpacity}
      onCopy={() => { void operate(copyPinnedImage, "Pinned image copied."); }}
      onClose={() => { void operate(closePinnedImage); }} onEdit={() => { void operate(editPinnedImage); }} /></fieldset> : !error && <p>Loading pinned image…</p>}
    <p role="status">{busy ? "Working…" : notice}</p>
  </main>;
}
