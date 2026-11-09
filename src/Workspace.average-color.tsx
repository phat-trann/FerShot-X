import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ImageDocument } from "./contracts/media";
import { inspectImageRegion, type InspectedRegion } from "./platform/pixel-inspection";
import { copyColor, type ColorCopyFormat } from "./platform/color-copy";
import { supportsNativeOutput } from "./platform/native";

export function AverageColorControls({ image, busy, run }: {
  image: ImageDocument; busy: boolean; run: (operation: () => Promise<void>) => Promise<void>;
}) {
  const [result, setResult] = useState<InspectedRegion | null>(null);
  const [format, setFormat] = useState<ColorCopyFormat>("hex");
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function sample(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const values = new FormData(event.currentTarget);
    const region = { x: Number(values.get("x")), y: Number(values.get("y")), width: Number(values.get("width")), height: Number(values.get("height")) };
    void run(async () => { const next = await inspectImageRegion(image, region); if (mounted.current) setResult(next); });
  }
  return <section aria-label="Average region color">
    <form onSubmit={sample}><fieldset disabled={busy}><legend>Average color of original image region</legend>
      <label>X<input aria-label="Average region X" name="x" type="number" min="0" max={image.width - 1} step="1" defaultValue="0" required /></label>
      <label>Y<input aria-label="Average region Y" name="y" type="number" min="0" max={image.height - 1} step="1" defaultValue="0" required /></label>
      <label>Width<input aria-label="Average region width" name="width" type="number" min="1" max={image.width} step="1" defaultValue={Math.min(image.width, 100)} required /></label>
      <label>Height<input aria-label="Average region height" name="height" type="number" min="1" max={image.height} step="1" defaultValue={Math.min(image.height, 100)} required /></label>
      <button>Sample average color</button>
    </fieldset></form>
    <p>Up to 1,000,000 pixels. Each RGBA channel is averaged equally from the original image.</p>
    {result && <><output aria-label="Average region color result" role="status"><span className="pixel-swatch" aria-hidden="true"
      style={{ backgroundColor: `rgba(${result.r},${result.g},${result.b},${result.a / 255})` }} />
      {result.hex} · RGBA {result.r}, {result.g}, {result.b}, {result.a} · {result.region.width} × {result.region.height} at {result.region.x}, {result.region.y}
    </output><label>Copy format<select aria-label="Average color copy format" value={format} onChange={event => setFormat(event.target.value as ColorCopyFormat)}>
      <option value="hex">HEX</option><option value="rgb">RGB</option><option value="rgba">RGBA</option>
    </select></label><button disabled={busy || !supportsNativeOutput()} onClick={() => { void run(() => copyColor(result, format)); }}>Copy average {format.toUpperCase()}</button></>}
  </section>;
}
