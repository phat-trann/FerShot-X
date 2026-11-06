import { useEffect, useImperativeHandle, useRef, useState, type FormEvent, type Ref } from "react";
import { CaptureSessionController, type CaptureArea, type DisplayGeometry } from "./features/capture-session";
import { readCaptureDisplay, captureRegion, NativeOperationError } from "./platform/native";
import type { ImageDocument } from "./contracts/media";

export interface RepeatRegionHandle {
  open(): void;
  repeat(): void;
  rememberRegion(display: DisplayGeometry, area: CaptureArea): void;
}
export function RepeatRegionControls({ busy, run, onCapture, controlRef }: {
  busy: boolean; run: (operation: () => Promise<void>) => Promise<void>;
  onCapture: (image: ImageDocument, scale: number) => Promise<void>;
  controlRef?: Ref<RepeatRegionHandle>;
}) {
  const [display, setDisplay] = useState<DisplayGeometry | null>(null);
  const [remembered, setRemembered] = useState<CaptureArea | null>(null);
  const [notice, setNotice] = useState("");
  const alive = useRef(true);
  const panel = useRef<HTMLDetailsElement>(null);
  const controller = useRef<CaptureSessionController<never, never> | null>(null);
  if (!controller.current) controller.current = new CaptureSessionController({
    acquire: async () => { throw new Error("Repeat region does not collect scroll frames."); },
    stitch: async () => { throw new Error("Repeat region does not stitch frames."); },
  }, { maxFrames: 1, maxBytes: 32 * 1024 * 1024, maxPixels: 16_777_216, overlap: 0 });
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  async function currentDisplay() {
    const next = await readCaptureDisplay();
    const repeat = controller.current!.getRepeatArea(next);
    if (alive.current) { setDisplay(next); setRemembered(repeat); }
    return next;
  }
  function readDisplay() { void run(async () => { await currentDisplay(); if (alive.current) setNotice("Coordinates use physical pixels relative to the primary display."); }); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const values = new FormData(event.currentTarget);
    const area = { x: Number(values.get("x")), y: Number(values.get("y")), width: Number(values.get("width")), height: Number(values.get("height")) };
    void run(async () => {
      const next = await currentDisplay();
      if (!display || display.id !== next.id || display.x !== next.x || display.y !== next.y || display.width !== next.width || display.height !== next.height || display.scale !== next.scale) {
        throw new Error("Display geometry updated. Review region coordinates and capture again.");
      }
      controller.current!.setRepeatArea(next, area);
      if (alive.current) setRemembered({ ...area });
      await capture(next, area);
    });
  }
  async function capture(next: DisplayGeometry, area: CaptureArea) {
    setNotice("");
    try {
      const result = await captureRegion(next, area);
      // Ownership transfers even if the controls unmount; the workspace handles its own lifetime.
      await onCapture(result.image, result.displayScale);
      if (alive.current) setNotice("Region captured. Repeat uses this rectangle while display geometry remains unchanged.");
    } catch (reason) {
      if (reason instanceof NativeOperationError && reason.code === "display_changed") {
        controller.current!.clearRepeatArea();
        await currentDisplay(); if (alive.current) setRemembered(null);
      }
      throw reason;
    }
  }
  function repeat() {
    if (busy) return;
    void run(async () => {
      const next = await currentDisplay(); const area = controller.current!.getRepeatArea(next);
      if (!area) throw new Error("The display changed or no region is remembered. Define a region first.");
      await capture(next, area);
    });
  }
  useImperativeHandle(controlRef, () => ({
    open() { if (panel.current) panel.current.open = true; if (!busy && !display) readDisplay(); },
    repeat() { if (panel.current) panel.current.open = true; repeat(); },
    rememberRegion(next: DisplayGeometry, area: CaptureArea) {
      controller.current!.setRepeatArea(next, area);
      if (alive.current) { setDisplay(next); setRemembered({ ...area }); }
    },
  }));
  return <details ref={panel}><summary>Fixed region / repeat capture</summary>
    <button type="button" disabled={busy} onClick={readDisplay}>Read primary display geometry</button>
    {display && <p>Primary display: {display.width} × {display.height} physical pixels; scale {display.scale}×.</p>}
    <form onSubmit={submit}><fieldset disabled={busy || !display}><legend>Capture rectangle in primary-display pixels</legend>
      <label>X<input name="x" type="number" min="0" max={display ? display.width - 1 : undefined} step="1" defaultValue="0" required /></label>
      <label>Y<input name="y" type="number" min="0" max={display ? display.height - 1 : undefined} step="1" defaultValue="0" required /></label>
      <label>Width<input name="width" type="number" min="1" max={display?.width} step="1" defaultValue="400" required /></label>
      <label>Height<input name="height" type="number" min="1" max={display?.height} step="1" defaultValue="300" required /></label>
      <button>Capture and remember region</button>
    </fieldset></form>
    <button type="button" disabled={busy || !remembered} onClick={repeat}>Repeat fixed region</button>
    <p>This explicit rectangle is separate from interactive area selection. The primary display is captured and cropped locally; only the cropped image enters the library.</p>
    {notice && <p role="status">{notice}</p>}
  </details>;
}
