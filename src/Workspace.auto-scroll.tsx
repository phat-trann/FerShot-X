import { useEffect, useRef, useState } from "react";
import type { ImageDocument } from "./contracts/media";
import { CaptureSessionController, type CaptureArea } from "./features/capture-session";
import { advanceAutoScroll, beginAutoScroll, captureRegion, endAutoScroll, readCaptureDisplay, stitchCapturedFrames } from "./platform/native";

export function WorkspaceAutoScroll({ blocked, onResult, onActivityChange }: {
  blocked: boolean; onResult: (image: ImageDocument) => void; onActivityChange: (active: boolean) => void;
}) {
  const [region, setRegion] = useState<CaptureArea>({ x: 0, y: 0, width: 400, height: 300 });
  const [interval, setIntervalMs] = useState(800);
  const [maxHeight, setMaxHeight] = useState(8192);
  const [reverse, setReverse] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [working, setWorking] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [error, setError] = useState("");
  const owned = useRef<CaptureSessionController<ImageDocument, ImageDocument> | null>(null);
  const generation = useRef(0); const pending = useRef(false); const stopped = useRef(false); const alive = useRef(true);
  const wake = useRef<(() => void) | null>(null);
  useEffect(() => { onActivityChange(working); }, [working, onActivityChange]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; generation.current++; stopped.current = true; wake.current?.(); owned.current?.cancel(); onActivityChange(false); };
  }, [onActivityChange]);

  function wait(milliseconds: number) {
    return new Promise<void>(resolve => {
      const done = () => { window.clearTimeout(timer); wake.current = null; resolve(); };
      const timer = window.setTimeout(done, milliseconds); wake.current = done;
    });
  }
  async function start() {
    if (pending.current || blocked) return;
    pending.current = true; stopped.current = false; setWorking(true); setPhase("capturing"); setFrameCount(0); setError("");
    const epoch = ++generation.current;
    const current = () => alive.current && epoch === generation.current;
    let nativeToken: string | null = null;
    try {
      const area = { ...region }, delay = interval, height = maxHeight, direction = reverse;
      if (![area.x, area.y, area.width, area.height, delay, height].every(Number.isSafeInteger) || area.x < 0 || area.y < 0 ||
          area.width < 1 || area.height < 16 || delay < 300 || delay > 5000 || height < 400 || height > 16384) throw new RangeError("Choose valid region, interval and output height values.");
      const display = await readCaptureDisplay(); if (!current()) return;
      nativeToken = await beginAutoScroll(display, area); if (!current()) return;
      const maximum = Math.max(1, Math.min(64, Math.floor(16_777_216 / (area.width * area.height)), Math.floor(32 * 1024 * 1024 / (area.width * area.height * 4 + 4096))));
      const controller = new CaptureSessionController<ImageDocument, ImageDocument>({
        acquire: async (_display, signal) => {
          if (signal.aborted) throw new Error("Automatic collection cancelled.");
          const result = await captureRegion(display, area); const image = result.image;
          return { value: image, width: image.width, height: image.height, byteSize: image.byteSize, release: () => URL.revokeObjectURL(image.src) };
        },
        stitch: async (frames, signal) => {
          const image = await stitchCapturedFrames(frames.map(frame => frame.value), { reverseDirection: direction, maxHeight: height }, signal);
          return { value: image, release: () => URL.revokeObjectURL(image.src) };
        },
      }, { maxFrames: maximum, maxBytes: 32 * 1024 * 1024, maxPixels: 16_777_216, overlap: 0 });
      owned.current = controller; controller.start(display);
      const step = Math.max(1, Math.min(2048, Math.floor(area.height / display.scale * 0.7)));
      for (let index = 0; index < maximum && current() && !stopped.current; index++) {
        if (index > 0) {
          await advanceAutoScroll(nativeToken, direction ? step : -step);
          if (!current() || stopped.current) break;
          await wait(delay); if (!current() || stopped.current) break;
        }
        await controller.capture(); if (!current()) return;
        setFrameCount(controller.state.frameCount);
      }
      if (!current()) return;
      if (!controller.state.frameCount) { controller.cancel(); setPhase("cancelled"); return; }
      setPhase("stitching"); const artifact = await controller.stop();
      if (!artifact) return;
      if (!current()) { artifact.release(); return; }
      try { onResult(artifact.value); } catch (reason) { artifact.release(); throw reason; }
      setPhase("completed");
    } catch (reason) {
      owned.current?.cancel();
      if (current()) { setError(reason instanceof Error ? reason.message : "Automatic scrolling failed."); setPhase("error"); }
    } finally {
      if (nativeToken) await endAutoScroll(nativeToken).catch(() => {});
      owned.current = null; pending.current = false;
      if (alive.current) setWorking(false);
    }
  }
  function stop() { stopped.current = true; wake.current?.(); }
  function cancel() { generation.current++; stopped.current = true; wake.current?.(); owned.current?.cancel(); setPhase("cancelled"); }
  return <section aria-label="Automatic scrolling capture"><h2>Automatic scrolling capture</h2>
    <p>Focus the target application once, then set a primary-display region inside its scrollable content. Keep that target unchanged while collecting.</p>
    <fieldset disabled={working || blocked}><legend>Capture settings</legend>
      {(["x", "y", "width", "height"] as const).map(key => <label key={key}>{key}<input type="number" aria-label={`Auto region ${key}`} value={region[key]}
        min={key === "width" || key === "height" ? 1 : 0} step="1" onChange={event => setRegion(previous => ({ ...previous, [key]: Number(event.target.value) }))} /></label>)}
      <label>Interval (ms)<input type="number" min="300" max="5000" step="100" value={interval} onChange={event => setIntervalMs(Number(event.target.value))} /></label>
      <label>Maximum output height<input type="number" min="400" max="16384" value={maxHeight} onChange={event => setMaxHeight(Number(event.target.value))} /></label>
      <label><input type="checkbox" checked={reverse} onChange={event => setReverse(event.target.checked)} />Reverse scroll direction</label>
    </fieldset>
    <button disabled={working || blocked} onClick={() => { void start(); }}>Start automatic capture</button>
    <button disabled={!working || phase !== "capturing"} onClick={stop}>Stop and stitch</button>
    <button disabled={!working} onClick={cancel}>Cancel automatic capture</button>
    <p role="status">{phase} · {frameCount} frames. Collection has fixed pixel/byte/frame limits; system input permission may be required.</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}
