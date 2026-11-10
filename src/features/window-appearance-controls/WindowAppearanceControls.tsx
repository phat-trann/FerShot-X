import React, { useState } from "react";
import type {
  ShadowTrimInsets,
  WindowAppearanceRenderRequest,
  WindowBackgroundAppearance,
} from "../window-appearance";
import "./WindowAppearanceControls.css";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";

export type BackgroundKind = "transparent" | "solid";

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export interface WindowAppearanceControlsProps {
  imageWidth: number;
  imageHeight: number;
  busy: boolean;
  windowSource?: CanvasImageSource;
  onApply: (request: WindowAppearanceRenderRequest) => void;
  className?: string;
}

export function validateTrimInsets(
  trim: ShadowTrimInsets,
  width: number,
  height: number,
): string | null {
  if (
    trim.top < 0 ||
    trim.right < 0 ||
    trim.bottom < 0 ||
    trim.left < 0 ||
    !Number.isInteger(trim.top) ||
    !Number.isInteger(trim.right) ||
    !Number.isInteger(trim.bottom) ||
    !Number.isInteger(trim.left)
  ) {
    return "Trim insets must be non-negative integers.";
  }
  if (trim.left + trim.right >= width) {
    return `Horizontal trim (${trim.left + trim.right}px) must be less than image width (${width}px).`;
  }
  if (trim.top + trim.bottom >= height) {
    return `Vertical trim (${trim.top + trim.bottom}px) must be less than image height (${height}px).`;
  }
  return null;
}

export function WindowAppearanceControls({
  imageWidth,
  imageHeight,
  busy,
  windowSource,
  onApply,
  className,
}: WindowAppearanceControlsProps): React.JSX.Element {
  const [backgroundKind, setBackgroundKind] = useState<BackgroundKind>("transparent");
  const [solidColor, setSolidColor] = useState<string>("#ffffff");
  const [enableTrim, setEnableTrim] = useState<boolean>(false);
  const [trimTop, setTrimTop] = useState<number>(0);
  const [trimRight, setTrimRight] = useState<number>(0);
  const [trimBottom, setTrimBottom] = useState<number>(0);
  const [trimLeft, setTrimLeft] = useState<number>(0);

  // Validate state
  let validationError: string | null = null;
  if (backgroundKind === "solid" && !HEX_COLOR_RE.test(solidColor.trim())) {
    validationError = "Solid background requires a valid hex color (e.g. #ffffff).";
  } else if (enableTrim) {
    const trimInsets: ShadowTrimInsets = {
      top: trimTop,
      right: trimRight,
      bottom: trimBottom,
      left: trimLeft,
    };
    validationError = validateTrimInsets(trimInsets, imageWidth, imageHeight);
  }

  const handleApply = () => {
    if (busy || validationError) return;

    let background: WindowBackgroundAppearance;
    if (backgroundKind === "solid") {
      background = { kind: "solid", color: solidColor.trim() };
    } else {
      background = { kind: "transparent" };
    }

    const source: CanvasImageSource =
      windowSource ??
      (() => {
        const fallback = document.createElement("canvas");
        fallback.width = Math.max(1, imageWidth);
        fallback.height = Math.max(1, imageHeight);
        return fallback;
      })();

    const request: WindowAppearanceRenderRequest = {
      captureMode: "window",
      windowSource: source,
      windowWidth: imageWidth,
      windowHeight: imageHeight,
      background,
      ...(enableTrim
        ? {
            shadowTrim: {
              top: trimTop,
              right: trimRight,
              bottom: trimBottom,
              left: trimLeft,
            },
          }
        : {}),
    };

    onApply(request);
  };

  const containerClasses = [
    "fershot-window-appearance-controls",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={containerClasses}
      aria-label="Window Appearance Controls"
      aria-busy={busy}
    >
      <div className="fershot-window-appearance-controls__field">
        <label className="fershot-window-appearance-controls__label">
          Background
        </label>
        <div
          className="fershot-window-appearance-controls__radio-group"
          role="radiogroup"
          aria-label="Background Type"
        >
          <label className="fershot-window-appearance-controls__radio-label">
            <input
              type="radio"
              name="window-appearance-bg"
              value="transparent"
              checked={backgroundKind === "transparent"}
              disabled={busy}
              onChange={() => setBackgroundKind("transparent")}
            />
            <span>Transparent</span>
          </label>
          <label className="fershot-window-appearance-controls__radio-label">
            <input
              type="radio"
              name="window-appearance-bg"
              value="solid"
              checked={backgroundKind === "solid"}
              disabled={busy}
              onChange={() => setBackgroundKind("solid")}
            />
            <span>Solid Color</span>
          </label>
        </div>

        {backgroundKind === "solid" && (
          <div className="fershot-window-appearance-controls__color-picker">
            <input
              type="color"
              aria-label="Pick Solid Background Color"
              value={HEX_COLOR_RE.test(solidColor) ? solidColor : "#ffffff"}
              disabled={busy}
              onChange={(e) => setSolidColor(e.target.value)}
            />
            <Input
              type="text"
              aria-label="Solid Hex Color"
              className="fershot-window-appearance-controls__color-input"
              value={solidColor}
              disabled={busy}
              maxLength={9}
              onChange={(e) => setSolidColor(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="fershot-window-appearance-controls__field">
        <label className="fershot-window-appearance-controls__checkbox-label">
          <Switch
            
            checked={enableTrim}
            disabled={busy}
            onCheckedChange={checked => setEnableTrim(checked)}
          />
          <span>Trim Window Shadow Insets</span>
        </label>

        {enableTrim && (
          <div className="fershot-window-appearance-controls__insets-grid">
            <label className="fershot-window-appearance-controls__inset-label">
              <span>Top</span>
              <Input
                type="number"
                min={0}
                max={Math.max(0, imageHeight - 1)}
                value={trimTop}
                disabled={busy}
                onChange={(e) => setTrimTop(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </label>
            <label className="fershot-window-appearance-controls__inset-label">
              <span>Right</span>
              <Input
                type="number"
                min={0}
                max={Math.max(0, imageWidth - 1)}
                value={trimRight}
                disabled={busy}
                onChange={(e) => setTrimRight(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </label>
            <label className="fershot-window-appearance-controls__inset-label">
              <span>Bottom</span>
              <Input
                type="number"
                min={0}
                max={Math.max(0, imageHeight - 1)}
                value={trimBottom}
                disabled={busy}
                onChange={(e) => setTrimBottom(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </label>
            <label className="fershot-window-appearance-controls__inset-label">
              <span>Left</span>
              <Input
                type="number"
                min={0}
                max={Math.max(0, imageWidth - 1)}
                value={trimLeft}
                disabled={busy}
                onChange={(e) => setTrimLeft(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </label>
          </div>
        )}
      </div>

      {validationError && (
        <p className="fershot-window-appearance-controls__error" role="alert">
          {validationError}
        </p>
      )}

      <div className="fershot-window-appearance-controls__actions">
        <button
          type="button"
          className="fershot-window-appearance-controls__apply-button"
          disabled={busy || Boolean(validationError)}
          onClick={handleApply}
        >
          Apply Appearance
        </button>
      </div>
    </section>
  );
}

