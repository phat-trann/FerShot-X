import { useState } from "react";
import type { ImageDocument } from "./contracts/media";
import { MeasurementOverlay, MAX_DISPLAY_SCALE, MIN_DISPLAY_SCALE, type MeasurementReadout, type MeasurementUnitMode } from "./features/measurement-panel";

export function MeasurementTools({ image, busy, onImprint }: {
  image: ImageDocument; busy: boolean; onImprint: (readout: MeasurementReadout, unit: MeasurementUnitMode) => void;
}) {
  const [coordinates, setCoordinates] = useState({ x1: "0", y1: "0", x2: String(image.width), y2: String(image.height) });
  const [scale, setScale] = useState("1");
  const [unit, setUnit] = useState<MeasurementUnitMode>("both");
  const number = (value: string) => value.trim() === "" ? Number.NaN : Number(value);
  return <fieldset disabled={busy} aria-label="Image measurement controls">
    <legend>Measure image</legend>
    <div>
      {(["x1", "y1", "x2", "y2"] as const).map(key => <label key={key}>
        {`Measurement ${key}`}<input type="number" aria-label={`Measurement ${key}`} min="0" max={key.startsWith("x") ? image.width : image.height}
          step="any" value={coordinates[key]} onChange={event => setCoordinates(previous => ({ ...previous, [key]: event.target.value }))} />
      </label>)}
      <label>Pixels per point<input type="number" aria-label="Measurement pixels per point" min={MIN_DISPLAY_SCALE} max={MAX_DISPLAY_SCALE} step="any"
        value={scale} onChange={event => setScale(event.target.value)} /></label>
    </div>
    <p>Set pixels per point explicitly. Image dimensions do not identify the display scale.</p>
    <MeasurementOverlay startPoint={{ x: number(coordinates.x1), y: number(coordinates.y1) }} endPoint={{ x: number(coordinates.x2), y: number(coordinates.y2) }}
      imageWidth={image.width} imageHeight={image.height} displayScale={number(scale)} unitMode={unit} busy={busy} onUnitModeChange={setUnit}
      onImprint={readout => onImprint(readout, unit)} onClear={() => setCoordinates({ x1: "0", y1: "0", x2: "0", y2: "0" })} />
  </fieldset>;
}
