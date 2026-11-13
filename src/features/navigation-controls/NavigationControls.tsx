import { ZoomOut, ZoomIn, Scaling } from "lucide-react";
import { Button } from "../../components/ui/button";
import React from "react";
import "./NavigationControls.css";

export interface NavigationControlsProps {
  zoomPercent: number;
  minZoomPercent?: number;
  maxZoomPercent?: number;
  busy: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToWindow: () => void;
  className?: string;
}

export function clampZoomPercent(
  percent: number,
  min = 25,
  max = 400,
): number {
  if (!Number.isFinite(percent)) return 100;
  return Math.min(max, Math.max(min, Math.round(percent)));
}

export function NavigationControls({
  zoomPercent,
  minZoomPercent = 25,
  maxZoomPercent = 400,
  busy,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToWindow,
  className,
}: NavigationControlsProps): React.JSX.Element {
  const clampedZoom = clampZoomPercent(zoomPercent, minZoomPercent, maxZoomPercent);
  const canZoomIn = !busy && clampedZoom < maxZoomPercent;
  const canZoomOut = !busy && clampedZoom > minZoomPercent;

  const containerClasses = [
    "fershot-navigation-controls",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <nav
      className={containerClasses}
      aria-label="Canvas Zoom and Navigation Controls"
      aria-busy={busy}
    >
      <div className="fershot-navigation-controls__group">
        <Button icon={ZoomOut} variant="secondary"
          type="button"
          className="fershot-navigation-controls__button"
          disabled={!canZoomOut}
          aria-label="Zoom Out"
          title="Zoom Out"
          onClick={onZoomOut}
        >
          −
        </Button>
        <span
          className="fershot-navigation-controls__zoom-display"
          title={`Current Zoom: ${clampedZoom}%`}
          aria-live="polite"
        >
          {clampedZoom}%
        </span>
        <Button icon={ZoomIn} variant="secondary"
          type="button"
          className="fershot-navigation-controls__button"
          disabled={!canZoomIn}
          aria-label="Zoom In"
          title="Zoom In"
          onClick={onZoomIn}
        >
          +
        </Button>
      </div>

      <div className="fershot-navigation-controls__divider" aria-hidden="true" />

      <div className="fershot-navigation-controls__group">
        <Button icon={Scaling} variant="secondary"
          type="button"
          className="fershot-navigation-controls__button fershot-navigation-controls__button--preset"
          disabled={busy || clampedZoom === 100}
          title="Reset Zoom to 100% (Actual Size)"
          onClick={onZoomReset}
        >
          1:1
        </Button>
        <Button icon={Scaling} variant="secondary"
          type="button"
          className="fershot-navigation-controls__button fershot-navigation-controls__button--preset"
          disabled={busy}
          title="Fit Image to Viewport"
          onClick={onFitToWindow}
        >
          Fit
        </Button>
      </div>
    </nav>
  );
}

