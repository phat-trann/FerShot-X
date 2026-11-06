import React, { useState } from "react";
import "./AutoAdjustPanel.css";
import {
  DEFAULT_AUTO_ADJUST_OPTIONS,
  MAX_AUTO_ADJUST_DIMENSION,
  MAX_AUTO_ADJUST_PIXELS,
  type AutoAdjustOptions,
} from "../auto-adjust/auto-adjust";

export interface AutoAdjustPanelProps {
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly busy: boolean;
  readonly onApply: (options: AutoAdjustOptions) => void;
}

function validDimensions(width: number, height: number): boolean {
  return (
    Number.isSafeInteger(width) &&
    Number.isSafeInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= MAX_AUTO_ADJUST_DIMENSION &&
    height <= MAX_AUTO_ADJUST_DIMENSION &&
    width * height <= MAX_AUTO_ADJUST_PIXELS
  );
}

export function AutoAdjustPanel({
  imageWidth,
  imageHeight,
  busy,
  onApply,
}: AutoAdjustPanelProps): React.JSX.Element {
  const [strength, setStrength] = useState(DEFAULT_AUTO_ADJUST_OPTIONS.strength);
  const [lowPercentile, setLowPercentile] = useState(
    DEFAULT_AUTO_ADJUST_OPTIONS.lowPercentile,
  );
  const [highPercentile, setHighPercentile] = useState(
    DEFAULT_AUTO_ADJUST_OPTIONS.highPercentile,
  );
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    if (!validDimensions(imageWidth, imageHeight)) {
      setError("Image dimensions exceed the automatic adjustment limits.");
      return;
    }
    if (
      !Number.isFinite(strength) ||
      strength < 0 ||
      strength > 1 ||
      !Number.isFinite(lowPercentile) ||
      !Number.isFinite(highPercentile) ||
      lowPercentile < 0 ||
      highPercentile > 1 ||
      lowPercentile >= highPercentile
    ) {
      setError("Strength and percentiles are invalid.");
      return;
    }
    setError(null);
    onApply({
      enabled: true,
      strength,
      lowPercentile,
      highPercentile,
    });
  };

  return (
    <section className="ferby-auto-adjust-panel" aria-label="Automatic tonal adjustment" aria-busy={busy}>
      <h2>Automatic tonal adjustment</h2>
      <p>This deterministic Ferby adjustment applies to the whole image.</p>
      <label>
        Strength
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={strength}
          disabled={busy}
          onChange={(event) => setStrength(Number(event.target.value))}
        />
      </label>
      <label>
        Low percentile
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={lowPercentile}
          disabled={busy}
          onChange={(event) => setLowPercentile(Number(event.target.value))}
        />
      </label>
      <label>
        High percentile
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={highPercentile}
          disabled={busy}
          onChange={(event) => setHighPercentile(Number(event.target.value))}
        />
      </label>
      <button type="button" disabled={busy} onClick={apply}>
        Apply adjustment
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
