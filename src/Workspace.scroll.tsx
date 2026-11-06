import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageDocument } from "./contracts/media";
import { CaptureSessionController } from "./features/capture-session";
import { ScrollWorkspace, type ScrollWorkspaceConfig, type ScrollWorkspaceState } from "./features/scroll-workspace";
import { captureImage, readCaptureDisplay, stitchCapturedFrames } from "./platform/native";
import { WorkspaceAutoScroll } from "./Workspace.auto-scroll";

export function WorkspaceScroll({ onResult, blocked, onActivityChange }: { onResult: (image: ImageDocument) => void; blocked: boolean; onActivityChange: (active: boolean) => void }) {
  const [automatic, setAutomatic] = useState(false);
  const [active, setActive] = useState(false);
  const change = useCallback((value: boolean) => { setActive(value); onActivityChange(value); }, [onActivityChange]);
  return <div><label><input type="checkbox" checked={automatic} disabled={active || blocked} onChange={event => setAutomatic(event.target.checked)} />Automatic scrolling</label>
    {automatic ? <WorkspaceAutoScroll blocked={blocked} onResult={onResult} onActivityChange={change} /> : <ManualScroll blocked={blocked} onResult={onResult} onActivityChange={change} />}
  </div>;
}

function ManualScroll({ onResult, blocked, onActivityChange }: { onResult: (image: ImageDocument) => void; blocked: boolean; onActivityChange: (active: boolean) => void }) {
  const [config, setConfig] = useState<ScrollWorkspaceConfig>({ maxHeight: 8192, reverseDirection: false });
  const [phase, setPhase] = useState<ScrollWorkspaceState>("idle");
  const [frameCount, setFrameCount] = useState(0);
  const [ioBusy, setIoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<CaptureSessionController<ImageDocument, ImageDocument> | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const running = phase === "capturing" || phase === "stitching";
  useEffect(() => { onActivityChange(running || ioBusy); }, [running, ioBusy, onActivityChange]);
  useEffect(() => () => onActivityChange(false), [onActivityChange]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; session.current?.cancel(); };
  }, []);

  async function operate(operation: (current: () => boolean) => Promise<void>) {
    if (pending.current || blocked) return;
    pending.current = true; setIoBusy(true); setError(null);
    const token = generation.current;
    const current = () => mounted.current && token === generation.current;
    try { await operation(current); }
    catch (reason) {
      if (current()) {
        session.current?.cancel(); setFrameCount(0); setPhase("error");
        setError(reason instanceof Error ? reason.message : "Frame collection failed.");
      }
    } finally { pending.current = false; if (mounted.current) setIoBusy(false); }
  }

  function start() {
    if (running) return;
    void operate(async current => {
      const display = await readCaptureDisplay();
      if (!current()) return;
      const options = { ...config };
      const controller = new CaptureSessionController<ImageDocument, ImageDocument>({
        acquire: async (_display, signal) => {
          if (signal.aborted) throw new Error("Frame collection cancelled.");
          const image = await captureImage("area");
          return { value: image, width: image.width, height: image.height, byteSize: image.byteSize,
            release: () => URL.revokeObjectURL(image.src) };
        },
        stitch: async (frames, signal) => {
          const image = await stitchCapturedFrames(frames.map(frame => frame.value), options, signal);
          return { value: image, release: () => URL.revokeObjectURL(image.src) };
        },
      }, { maxFrames: 64, maxBytes: 32 * 1024 * 1024, maxPixels: 16_777_216, overlap: 0 });
      session.current?.cancel(); session.current = controller;
      controller.start(display); setFrameCount(0); setPhase("capturing");
    });
  }

  function capture() {
    const controller = session.current;
    if (!controller || phase !== "capturing" || controller.state.frameCount >= 64) return;
    void operate(async current => {
      await controller.capture();
      if (current()) setFrameCount(controller.state.frameCount);
    });
  }

  function stop() {
    const controller = session.current;
    if (!controller || phase !== "capturing" || !controller.state.frameCount) return;
    void operate(async current => {
      setPhase("stitching");
      const artifact = await controller.stop();
      if (!artifact) return;
      if (!current()) { artifact.release(); return; }
      try { onResult(artifact.value); }
      catch (reason) { artifact.release(); throw reason; }
      setFrameCount(0); setPhase("completed");
    });
  }

  function cancel() {
    generation.current++; session.current?.cancel(); setFrameCount(0); setPhase("cancelled"); setError(null);
    // In-flight native work still owns its IO slot until its promise settles.
  }

  return <div>
    <ScrollWorkspace state={phase} config={config} frameCount={frameCount} busy={running || ioBusy || blocked}
      error={error} onConfigChange={next => { if (!running && !pending.current && !blocked) setConfig(next); }}
      onStart={start} onCaptureFrame={capture} onStop={stop} onCancel={cancel} />
    {ioBusy && <p role="status">Waiting for the current frame operation…</p>}
    <p>Select the same-sized area each time and retain overlapping rows. Matching is exact; animated content or sticky headers may fail. Output is limited to 16,384 px per side and 16 megapixels. Cancelling discards private frames.</p>
  </div>;
}
