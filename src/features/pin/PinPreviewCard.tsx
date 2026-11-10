import React from "react";
import type { ImageDocument } from "../../contracts/media";
import "./PinPreviewCard.css";
import { Input } from "../../components/ui/input";

export const MIN_PIN_SCALE = 0.25;
export const MAX_PIN_SCALE = 2.0;
export const MIN_PIN_OPACITY = 0.2;
export const MAX_PIN_OPACITY = 1.0;

export const PIN_SCALE_PRESETS: readonly number[] = [0.5, 1.0, 2.0];

export function clampPinScale(value: number): number {
  if (!Number.isFinite(value)) {
    return 1.0;
  }
  const clamped = Math.min(MAX_PIN_SCALE, Math.max(MIN_PIN_SCALE, value));
  return Math.round(clamped * 100) / 100;
}

export function clampPinOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1.0;
  }
  const clamped = Math.min(MAX_PIN_OPACITY, Math.max(MIN_PIN_OPACITY, value));
  return Math.round(clamped * 100) / 100;
}

export interface PinPreviewProps {
  readonly document: ImageDocument;
  readonly scale: number;
  readonly opacity: number;
  readonly onScaleChange: (nextScale: number) => void;
  readonly onOpacityChange: (nextOpacity: number) => void;
  readonly onEdit: (id: string) => void;
  readonly onCopy: (id: string) => void;
  readonly onClose: (id: string) => void;
}

export function PinPreviewCard({
  document,
  scale,
  opacity,
  onScaleChange,
  onOpacityChange,
  onEdit,
  onCopy,
  onClose,
}: PinPreviewProps): React.JSX.Element {
  const safeScale = clampPinScale(scale);
  const safeOpacity = clampPinOpacity(opacity);
  const scaledWidth = Math.max(1, Math.round(document.width * safeScale));
  const scaledHeight = Math.max(1, Math.round(document.height * safeScale));
  const isSemiTransparent = Math.abs(safeOpacity - 0.5) < 0.01;

  const handleScalePercentChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const parsed = Number(event.target.value);
    if (event.target.value.trim() === "" || Number.isNaN(parsed)) {
      return;
    }
    onScaleChange(clampPinScale(parsed / 100));
  };

  const handleOpacityPercentChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const parsed = Number(event.target.value);
    if (event.target.value.trim() === "" || Number.isNaN(parsed)) {
      return;
    }
    onOpacityChange(clampPinOpacity(parsed / 100));
  };

  return (
    <section
      className="fershot-pin-preview"
      aria-label={`Pinned preview: ${document.name}`}
    >
      <header className="fershot-pin-preview__header">
        <h2 className="fershot-pin-preview__title">{document.name}</h2>
        <span className="fershot-pin-preview__dims">
          {scaledWidth}×{scaledHeight} px ({Math.round(safeScale * 100)}%)
        </span>
      </header>

      <div className="fershot-pin-preview__controls">
        <div
          className="fershot-pin-preview__group"
          role="group"
          aria-label="Pin scale presets"
        >
          {PIN_SCALE_PRESETS.map((preset) => {
            const pct = Math.round(preset * 100);
            const active = Math.abs(safeScale - preset) < 0.01;
            return (
              <button
                key={preset}
                type="button"
                className="fershot-pin-preview__btn"
                aria-pressed={active}
                onClick={() => onScaleChange(clampPinScale(preset))}
              >
                {pct}%
              </button>
            );
          })}
        </div>

        <div className="fershot-pin-preview__group">
          <label
            className="fershot-pin-preview__label"
            htmlFor={`pin-scale-${document.id}`}
          >
            Scale (%)
          </label>
          <Input
            id={`pin-scale-${document.id}`}
            type="number"
            className="fershot-pin-preview__input"
            aria-label="Pin scale percentage"
            min={Math.round(MIN_PIN_SCALE * 100)}
            max={Math.round(MAX_PIN_SCALE * 100)}
            step={5}
            value={Math.round(safeScale * 100)}
            onChange={handleScalePercentChange}
          />
        </div>

        <div className="fershot-pin-preview__group">
          <label
            className="fershot-pin-preview__label"
            htmlFor={`pin-opacity-${document.id}`}
          >
            Opacity (%)
          </label>
          <Input
            id={`pin-opacity-${document.id}`}
            type="number"
            className="fershot-pin-preview__input"
            aria-label="Pin opacity percentage"
            min={Math.round(MIN_PIN_OPACITY * 100)}
            max={Math.round(MAX_PIN_OPACITY * 100)}
            step={5}
            value={Math.round(safeOpacity * 100)}
            onChange={handleOpacityPercentChange}
          />
          <button
            type="button"
            className="fershot-pin-preview__btn"
            aria-pressed={isSemiTransparent}
            onClick={() =>
              onOpacityChange(isSemiTransparent ? 1.0 : 0.5)
            }
          >
            Semi-transparent
          </button>
        </div>
      </div>

      <div className="fershot-pin-preview__viewport">
        <img
          className="fershot-pin-preview__image"
          src={document.src}
          alt={document.name}
          width={scaledWidth}
          height={scaledHeight}
          style={{ opacity: safeOpacity }}
        />
      </div>

      <footer
        className="fershot-pin-preview__actions"
        role="group"
        aria-label="Pinned image actions"
      >
        <button
          type="button"
          className="fershot-pin-preview__btn"
          onClick={() => onEdit(document.id)}
        >
          Edit Image
        </button>
        <button
          type="button"
          className="fershot-pin-preview__btn"
          onClick={() => onCopy(document.id)}
        >
          Copy Image
        </button>
        <button
          type="button"
          className="fershot-pin-preview__btn"
          onClick={() => onClose(document.id)}
        >
          Close Pin
        </button>
      </footer>
    </section>
  );
}

export { PinPreviewCard as PinPanel };

