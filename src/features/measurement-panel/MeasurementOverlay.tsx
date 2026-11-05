import React from "react";
import type { Point, Rect } from "../../contracts/editor";
import {
  clampPointToImage,
  normalizeRect,
  pixelsToPoints,
} from "../measurement/measurement";
import "./MeasurementOverlay.css";

export const MAX_MEASUREMENT_IMAGE_DIMENSION = 16_384;
export const MIN_DISPLAY_SCALE = 0.25;
export const MAX_DISPLAY_SCALE = 8;

export type MeasurementUnitMode = "px" | "pt" | "both";

export interface MeasurementReadout {
  readonly rectPx: Readonly<Rect>;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly widthPt: number;
  readonly heightPt: number;
  readonly displayScale: number;
  readonly formattedPx: string;
  readonly formattedPt: string;
}

export interface MeasurementOverlayProps {
  readonly startPoint: Readonly<Point>;
  readonly endPoint: Readonly<Point>;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly displayScale: number;
  readonly unitMode?: MeasurementUnitMode;
  readonly busy?: boolean;
  readonly onUnitModeChange?: (mode: MeasurementUnitMode) => void;
  readonly onImprint?: (readout: MeasurementReadout) => void;
  readonly onClear?: () => void;
}

function formatDimensionNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

export function computeMeasurementReadout(
  startPoint: Readonly<Point>,
  endPoint: Readonly<Point>,
  imageWidth: number,
  imageHeight: number,
  displayScale: number,
): MeasurementReadout {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    imageWidth > MAX_MEASUREMENT_IMAGE_DIMENSION ||
    imageHeight > MAX_MEASUREMENT_IMAGE_DIMENSION
  ) {
    throw new RangeError(
      `Image dimensions must be between 1 and ${MAX_MEASUREMENT_IMAGE_DIMENSION} pixels.`,
    );
  }

  if (
    !Number.isFinite(displayScale) ||
    displayScale < MIN_DISPLAY_SCALE ||
    displayScale > MAX_DISPLAY_SCALE
  ) {
    throw new RangeError(
      `displayScale must be between ${MIN_DISPLAY_SCALE} and ${MAX_DISPLAY_SCALE}.`,
    );
  }

  const clampedStart = clampPointToImage(startPoint, imageWidth, imageHeight);
  const clampedEnd = clampPointToImage(endPoint, imageWidth, imageHeight);
  const rect = normalizeRect(clampedStart, clampedEnd);

  const widthPx = rect.width;
  const heightPx = rect.height;
  const widthPt = pixelsToPoints(widthPx, displayScale);
  const heightPt = pixelsToPoints(heightPx, displayScale);

  const formattedPx = `${formatDimensionNumber(widthPx)} × ${formatDimensionNumber(heightPx)} px`;
  const formattedPt = `${formatDimensionNumber(widthPt)} × ${formatDimensionNumber(heightPt)} pt`;

  return Object.freeze({
    rectPx: Object.freeze({ ...rect }),
    widthPx,
    heightPx,
    widthPt,
    heightPt,
    displayScale,
    formattedPx,
    formattedPt,
  });
}

export const MeasurementOverlay: React.FC<MeasurementOverlayProps> = ({
  startPoint,
  endPoint,
  imageWidth,
  imageHeight,
  displayScale,
  unitMode = "both",
  busy = false,
  onUnitModeChange,
  onImprint,
  onClear,
}) => {
  let readout: MeasurementReadout | null = null;
  let validationError: string | null = null;

  try {
    readout = computeMeasurementReadout(
      startPoint,
      endPoint,
      imageWidth,
      imageHeight,
      displayScale,
    );
  } catch (err) {
    validationError =
      err instanceof Error ? err.message : "Invalid measurement bounds.";
  }

  const canImprint =
    !busy &&
    readout !== null &&
    readout.widthPx > 0 &&
    readout.heightPx > 0;

  return (
    <section
      className="ferby-measurement-overlay"
      aria-label="Measurement overlay"
    >
      <header className="ferby-measurement-overlay__header">
        <span className="ferby-measurement-overlay__title">Measurement</span>
        <span
          className="ferby-measurement-overlay__scale"
          aria-label="Display scale"
        >
          {Number.isFinite(displayScale) ? `${displayScale}x` : "Invalid scale"}
        </span>
      </header>

      {validationError ? (
        <div role="alert" className="ferby-measurement-overlay__error">
          {validationError}
        </div>
      ) : (
        readout && (
          <div className="ferby-measurement-overlay__values">
            {(unitMode === "px" || unitMode === "both") && (
              <div
                className="ferby-measurement-overlay__readout"
                aria-label="Pixel dimensions"
              >
                {readout.formattedPx}
              </div>
            )}
            {(unitMode === "pt" || unitMode === "both") && (
              <div
                className="ferby-measurement-overlay__readout ferby-measurement-overlay__readout--pt"
                aria-label="Point dimensions"
              >
                {readout.formattedPt}
              </div>
            )}
            <div
              className="ferby-measurement-overlay__origin"
              aria-label="Selection origin"
            >
              Origin: ({formatDimensionNumber(readout.rectPx.x)},{" "}
              {formatDimensionNumber(readout.rectPx.y)}) px
            </div>
          </div>
        )
      )}

      <div
        className="ferby-measurement-overlay__units"
        role="group"
        aria-label="Measurement units"
      >
        {(["px", "pt", "both"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={busy}
            aria-pressed={unitMode === mode}
            onClick={() => onUnitModeChange?.(mode)}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="ferby-measurement-overlay__actions">
        <button
          type="button"
          disabled={!canImprint}
          onClick={() => {
            if (!readout || !canImprint) return;
            onImprint?.(
              Object.freeze({
                ...readout,
                rectPx: Object.freeze({ ...readout.rectPx }),
              }),
            );
          }}
        >
          Imprint Dimensions
        </button>
        {onClear && (
          <button type="button" disabled={busy} onClick={() => onClear()}>
            Clear Measurement
          </button>
        )}
      </div>
    </section>
  );
};

