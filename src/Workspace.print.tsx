import { useEffect, useRef, useState } from "react";
import { computePrintSheetLayout } from "./features/local-output";
import { closePrintPreview, readPrintPreview, requestPrintDialog } from "./platform/native";

export default function PrintWorkspace() {
  const [document, setDocument] = useState<Awaited<ReturnType<typeof readPrintPreview>> | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true; let active = true; let src: string | undefined;
    void readPrintPreview().then(value => {
      if (!active) { URL.revokeObjectURL(value.image.src); return; }
      src = value.image.src; setDocument(value);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load print preview."); });
    return () => { active = false; mounted.current = false; if (src) URL.revokeObjectURL(src); };
  }, []);

  async function operate(operation: () => Promise<void>) {
    if (pending.current) return; pending.current = true; setBusy(true); setError("");
    try { await operation(); }
    catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : "Print operation failed."); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  const layout = document ? computePrintSheetLayout(document.options) : null;
  return <main className="print-workspace" style={{ padding: 16, background: "#ddd", minHeight: "100vh", overflow: "auto" }}>
    <div className="print-controls">
      <h1>Print preview</h1>
      <button disabled={busy || !ready} onClick={() => { void operate(async () => { await requestPrintDialog(); if (mounted.current) setStatus("Print dialog requested. Complete or cancel it in the system dialog."); }); }}>Open system print dialog</button>
      <button disabled={busy} onClick={() => { void operate(closePrintPreview); }}>Close print preview</button>
      {status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}
      <p>Printing starts only from the button above. System paper/printer options can override the CSS preview; verify them in the dialog.</p>
    </div>
    {document && layout && <>
      <style>{`@page { size: ${layout.pageWidthPt}pt ${layout.pageHeightPt}pt; margin: 0; }
        @media print { html, body, #root { margin: 0 !important; padding: 0 !important; min-width: 0 !important; min-height: 0 !important; width: auto !important; height: auto !important; overflow: visible !important; } .print-workspace { padding: 0 !important; background: white !important; min-height: 0 !important; overflow: visible !important; } .print-controls { display: none !important; } .print-sheet { margin: 0 !important; break-inside: avoid; } }`}</style>
      <div className="print-sheet" aria-label="Print sheet" style={{ position: "relative", background: "white", width: `${layout.pageWidthPt}pt`, height: `${layout.pageHeightPt}pt`, marginTop: 16, overflow: "hidden" }}>
        <img src={document.image.src} alt="Image to print" onLoad={() => setReady(true)} onError={() => { setReady(false); setError("The print image could not be decoded."); }}
          style={{ position: "absolute", left: `${layout.drawXPt}pt`, top: `${layout.drawYPt}pt`, width: `${layout.drawWidthPt}pt`, height: `${layout.drawHeightPt}pt`, maxWidth: "none" }} />
      </div>
    </>}
  </main>;
}
