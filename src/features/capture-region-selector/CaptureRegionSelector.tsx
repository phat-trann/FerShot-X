import React, { useRef, useState, useCallback, useEffect } from "react";
import type { ImageDocument } from "../../contracts/media";
import type { Point } from "../../contracts/editor";
import { mapClientPoint } from "../point-map";
import "./CaptureRegionSelector.css";

export interface CaptureSelectedArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CaptureRegionSelectorProps {
  readonly image: ImageDocument;
  readonly busy: boolean;
  readonly onConfirm: (area: CaptureSelectedArea) => void;
  readonly onCancel: () => void;
}

export function clampInt(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, Math.round(val)));
}

export function CaptureRegionSelector({
  image,
  busy,
  onConfirm,
  onCancel,
}: CaptureRegionSelectorProps): React.JSX.Element {
  const [area, setArea] = useState<CaptureSelectedArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Point | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const hostRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const previous = document.activeElement;
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  useEffect(() => {
    if (!busy) hostRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [busy]);

  const getSourcePoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      if (!imgRef.current) return null;
      const rect = imgRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return mapClientPoint(
        { x: clientX, y: clientY },
        { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
        { width: image.width, height: image.height },
      );
    },
    [image.width, image.height],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (busy || e.button !== 0) return;
    const pt = getSourcePoint(e.clientX, e.clientY);
    if (!pt) return;

    dragStartRef.current = {
      x: clampInt(pt.x, 0, image.width),
      y: clampInt(pt.y, 0, image.height),
    };
    setIsDragging(true);
    setArea({
      x: clampInt(pt.x, 0, image.width),
      y: clampInt(pt.y, 0, image.height),
      width: 0,
      height: 0,
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (busy || !isDragging || !dragStartRef.current) return;
    const pt = getSourcePoint(e.clientX, e.clientY);
    if (!pt) return;

    const startX = dragStartRef.current.x;
    const startY = dragStartRef.current.y;
    const curX = clampInt(pt.x, 0, image.width);
    const curY = clampInt(pt.y, 0, image.height);

    const minX = Math.min(startX, curX);
    const minY = Math.min(startY, curY);
    const w = Math.abs(curX - startX);
    const h = Math.abs(curY - startY);

    setArea({
      x: minX,
      y: minY,
      width: w,
      height: h,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored if capture already lost
      }
    }
  };

  const handleManualChange = (
    field: keyof CaptureSelectedArea,
    rawValue: string,
  ) => {
    const val = parseInt(rawValue, 10);
    if (Number.isNaN(val)) return;

    setArea((prev) => {
      if (field === "x") {
        const nextX = clampInt(val, 0, image.width);
        const nextW = Math.min(prev.width, image.width - nextX);
        return { ...prev, x: nextX, width: Math.max(0, nextW) };
      }
      if (field === "y") {
        const nextY = clampInt(val, 0, image.height);
        const nextH = Math.min(prev.height, image.height - nextY);
        return { ...prev, y: nextY, height: Math.max(0, nextH) };
      }
      if (field === "width") {
        const nextW = clampInt(val, 0, image.width - prev.x);
        return { ...prev, width: nextW };
      }
      if (field === "height") {
        const nextH = clampInt(val, 0, image.height - prev.y);
        return { ...prev, height: nextH };
      }
      return prev;
    });
  };

  // Percentages track the image through loading and viewport resize without stale DOM measurements.
  let overlayStyle: React.CSSProperties | undefined;
  if (area.width > 0 && area.height > 0) {
    overlayStyle = {
      left: `${area.x / image.width * 100}%`,
      top: `${area.y / image.height * 100}%`,
      width: `${area.width / image.width * 100}%`,
      height: `${area.height / image.height * 100}%`,
    };
  }

  const hasValidSelection = area.width > 0 && area.height > 0;

  return (
    <section
      ref={hostRef}
      className="ferby-region-selector"
      aria-label="Area selection workspace"
      data-testid="capture-region-selector"
      onKeyDown={event => {
        if (event.key === "Escape" && !busy) { event.preventDefault(); event.stopPropagation(); onCancel(); }
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("input:not(:disabled), button:not(:disabled)"));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
    >
      <header className="ferby-region-selector__header">
        <h3 className="ferby-region-selector__title">Select Capture Region</h3>
        <span className="ferby-region-selector__meta">
          Source: {image.width} × {image.height} px
        </span>
      </header>

      <div
        className="ferby-region-selector__canvas-wrap"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="ferby-region-selector__image-wrap">
        <img
          ref={imgRef}
          src={image.src}
          alt={image.name || "Capture preview"}
          className="ferby-region-selector__image"
          draggable={false}
        />
        {overlayStyle && (
          <div
            className="ferby-region-selector__box"
            style={overlayStyle}
            data-testid="region-selector-overlay"
          />
        )}
        </div>
      </div>

      <div className="ferby-region-selector__inputs">
        <label className="ferby-region-selector__field">
          X (px)
          <input
            type="number"
            min={0}
            max={image.width}
            value={area.x}
            disabled={busy}
            onChange={(e) => handleManualChange("x", e.target.value)}
          />
        </label>
        <label className="ferby-region-selector__field">
          Y (px)
          <input
            type="number"
            min={0}
            max={image.height}
            value={area.y}
            disabled={busy}
            onChange={(e) => handleManualChange("y", e.target.value)}
          />
        </label>
        <label className="ferby-region-selector__field">
          Width (px)
          <input
            type="number"
            min={0}
            max={image.width - area.x}
            value={area.width}
            disabled={busy}
            onChange={(e) => handleManualChange("width", e.target.value)}
          />
        </label>
        <label className="ferby-region-selector__field">
          Height (px)
          <input
            type="number"
            min={0}
            max={image.height - area.y}
            value={area.height}
            disabled={busy}
            onChange={(e) => handleManualChange("height", e.target.value)}
          />
        </label>
      </div>

      <footer className="ferby-region-selector__actions">
        <button
          type="button"
          className="ferby-region-selector__btn"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="ferby-region-selector__btn ferby-region-selector__btn--primary"
          disabled={busy || !hasValidSelection}
          onClick={() => onConfirm(area)}
        >
          Confirm Selection
        </button>
      </footer>
    </section>
  );
}

