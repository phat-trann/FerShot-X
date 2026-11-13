import { Copy } from "lucide-react";
import { Button } from "../../components/ui/button";
import React from "react";
import { rgbToHex } from "../color/color";
import "./ColorFormatControls.css";

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ColorFormatControlsProps {
  color: RgbaColor | null;
  busy: boolean;
  onCopy: (text: string) => void;
  className?: string;
}

export function isValidColorChannel(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255;
}

export function validateRgbaColor(color: RgbaColor): boolean {
  return (
    isValidColorChannel(color.r) &&
    isValidColorChannel(color.g) &&
    isValidColorChannel(color.b) &&
    isValidColorChannel(color.a)
  );
}

export function formatColorValues(color: RgbaColor): {
  hex: string;
  rgb: string;
  rgba: string;
} {
  const hex = rgbToHex(color.r, color.g, color.b);
  const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;
  const alphaNormalized =
    color.a === 255
      ? "1"
      : color.a === 0
      ? "0"
      : parseFloat((color.a / 255).toFixed(3)).toString();
  const rgba = `rgba(${color.r}, ${color.g}, ${color.b}, ${alphaNormalized})`;

  return { hex, rgb, rgba };
}

export function ColorFormatControls({
  color,
  busy,
  onCopy,
  className,
}: ColorFormatControlsProps): React.JSX.Element {
  const isColorPresent = color !== null;
  const isValid = isColorPresent && validateRgbaColor(color);

  const containerClasses = [
    "fershot-color-format-controls",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleCopy = (formattedText: string) => {
    if (busy || !isValid) return;
    onCopy(formattedText);
  };

  const formatted = isValid ? formatColorValues(color) : null;

  return (
    <section
      className={containerClasses}
      aria-label="Color Format Copy Controls"
      aria-busy={busy}
    >
      <div className="fershot-color-format-controls__header">
        <h3 className="fershot-color-format-controls__title">Sampled Color</h3>
        {isValid && (
          <div
            className="fershot-color-format-controls__swatch"
            style={{
              backgroundColor: formatted?.rgba,
            }}
            aria-label={`Color swatch for ${formatted?.hex}`}
          />
        )}
      </div>

      {!isColorPresent ? (
        <p className="fershot-color-format-controls__status fershot-color-format-controls__status--empty">
          No color sampled. Hover or click an image pixel to inspect.
        </p>
      ) : !isValid ? (
        <p
          className="fershot-color-format-controls__status fershot-color-format-controls__status--invalid"
          role="alert"
        >
          Invalid color: channels must be integers from 0 to 255.
        </p>
      ) : (
        <div className="fershot-color-format-controls__formats">
          <div className="fershot-color-format-controls__row">
            <span className="fershot-color-format-controls__label">HEX</span>
            <code className="fershot-color-format-controls__value">
              {formatted?.hex}
            </code>
            <Button icon={Copy} variant="secondary"
              type="button"
              className="fershot-color-format-controls__button"
              disabled={busy}
              onClick={() => formatted && handleCopy(formatted.hex)}
            >
              Copy
            </Button>
          </div>

          <div className="fershot-color-format-controls__row">
            <span className="fershot-color-format-controls__label">RGB</span>
            <code className="fershot-color-format-controls__value">
              {formatted?.rgb}
            </code>
            <Button icon={Copy} variant="secondary"
              type="button"
              className="fershot-color-format-controls__button"
              disabled={busy}
              onClick={() => formatted && handleCopy(formatted.rgb)}
            >
              Copy
            </Button>
          </div>

          <div className="fershot-color-format-controls__row">
            <span className="fershot-color-format-controls__label">RGBA</span>
            <code className="fershot-color-format-controls__value">
              {formatted?.rgba}
            </code>
            <Button icon={Copy} variant="secondary"
              type="button"
              className="fershot-color-format-controls__button"
              disabled={busy}
              onClick={() => formatted && handleCopy(formatted.rgba)}
            >
              Copy
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

