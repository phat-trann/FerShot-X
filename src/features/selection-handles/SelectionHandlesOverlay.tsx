import React, { useRef, useState } from "react";
import type { Annotation, Point, Rect } from "../../contracts/editor";
import "./SelectionHandlesOverlay.css";

export type ResizeHandleId =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

export const ALL_RESIZE_HANDLES: readonly ResizeHandleId[] = Object.freeze([
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
] as const);

export const MIN_SELECTION_SIZE_PX = 2;
export const MAX_SELECTION_IMAGE_DIMENSION = 16_384;

/**
 * Proposed adapter contract for Codex integration (`C09` / `EditorViewProps` extension)
 * without modifying frozen `src/contracts/editor.ts`.
 */
export interface SelectionHandlesAdapterProposal {
  readonly selectedAnnotationId: string | null;
  readonly onAnnotationMove: (next: Annotation) => void;
  readonly onAnnotationResize: (
    next: Annotation,
    handle: ResizeHandleId,
  ) => void;
}

export interface SelectionHandlesOverlayProps {
  readonly annotation: Readonly<Annotation>;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly zoom?: number;
  readonly disabled?: boolean;
  readonly onMove: (next: Annotation, deltaImagePx: Readonly<Point>) => void;
  readonly onResize: (
    next: Annotation,
    handle: ResizeHandleId,
    boundsImagePx: Readonly<Rect>,
  ) => void;
  readonly onCancel?: () => void;
}

function validateImageBounds(imageWidth: number, imageHeight: number): void {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth < MIN_SELECTION_SIZE_PX ||
    imageHeight < MIN_SELECTION_SIZE_PX ||
    imageWidth > MAX_SELECTION_IMAGE_DIMENSION ||
    imageHeight > MAX_SELECTION_IMAGE_DIMENSION
  ) {
    throw new RangeError(
      `Image dimensions (${imageWidth}x${imageHeight}) are out of bounds.`,
    );
  }
}

function cloneFrozenAnnotation(
  source: Readonly<Annotation>,
  points: readonly Point[],
): Annotation {
  const frozenPoints = Object.freeze(
    points.map((pt) =>
      Object.freeze({
        x: Math.round(pt.x * 100) / 100,
        y: Math.round(pt.y * 100) / 100,
      }),
    ),
  );
  return Object.freeze({
    ...source,
    style: Object.freeze({ ...source.style }),
    points: frozenPoints,
  });
}

export function computeAnnotationBounds(
  annotation: Readonly<Annotation>,
): Readonly<Rect> {
  if (annotation.points.length === 0) {
    throw new RangeError("Annotation must contain at least one point.");
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of annotation.points) {
    if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
      throw new RangeError("Annotation point coordinates must be finite.");
    }
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  return Object.freeze({
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  });
}

export function moveAnnotationPoints(
  annotation: Readonly<Annotation>,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
): Annotation {
  validateImageBounds(imageWidth, imageHeight);
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
    throw new RangeError("Move deltas must be finite numbers.");
  }

  const bounds = computeAnnotationBounds(annotation);
  const clampedDx = Math.min(
    imageWidth - (bounds.x + bounds.width),
    Math.max(-bounds.x, deltaX),
  );
  const clampedDy = Math.min(
    imageHeight - (bounds.y + bounds.height),
    Math.max(-bounds.y, deltaY),
  );

  const nextPoints = annotation.points.map((pt) => ({
    x: pt.x + clampedDx,
    y: pt.y + clampedDy,
  }));

  return cloneFrozenAnnotation(annotation, nextPoints);
}

export function resizeAnnotationPoints(
  annotation: Readonly<Annotation>,
  handle: ResizeHandleId,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
): Annotation {
  validateImageBounds(imageWidth, imageHeight);
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
    throw new RangeError("Resize deltas must be finite numbers.");
  }

  const bounds = computeAnnotationBounds(annotation);
  let left = bounds.x;
  let top = bounds.y;
  let right = bounds.x + Math.max(MIN_SELECTION_SIZE_PX, bounds.width);
  let bottom = bounds.y + Math.max(MIN_SELECTION_SIZE_PX, bounds.height);

  if (handle.includes("w")) {
    left = Math.max(
      0,
      Math.min(right - MIN_SELECTION_SIZE_PX, left + deltaX),
    );
  }
  if (handle.includes("e")) {
    right = Math.min(
      imageWidth,
      Math.max(left + MIN_SELECTION_SIZE_PX, right + deltaX),
    );
  }
  if (handle.includes("n")) {
    top = Math.max(
      0,
      Math.min(bottom - MIN_SELECTION_SIZE_PX, top + deltaY),
    );
  }
  if (handle.includes("s")) {
    bottom = Math.min(
      imageHeight,
      Math.max(top + MIN_SELECTION_SIZE_PX, bottom + deltaY),
    );
  }

  const newWidth = right - left;
  const newHeight = bottom - top;
  const oldWidth = bounds.width;
  const oldHeight = bounds.height;

  const nextPoints = annotation.points.map((pt) => {
    const normX = oldWidth > 0 ? (pt.x - bounds.x) / oldWidth : 0;
    const normY = oldHeight > 0 ? (pt.y - bounds.y) / oldHeight : 0;
    return {
      x: left + normX * newWidth,
      y: top + normY * newHeight,
    };
  });

  return cloneFrozenAnnotation(annotation, nextPoints);
}

interface ActiveGesture {
  readonly pointerId: number;
  readonly mode: "move" | ResizeHandleId;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly lastClientX: number;
  readonly lastClientY: number;
}

export const SelectionHandlesOverlay: React.FC<SelectionHandlesOverlayProps> = ({
  annotation,
  imageWidth,
  imageHeight,
  zoom = 1,
  disabled = false,
  onMove,
  onResize,
  onCancel,
}) => {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const gestureRef = useRef<ActiveGesture | null>(null);
  const [, setTick] = useState(0);

  const bounds = computeAnnotationBounds(annotation);

  const startGesture = (
    mode: "move" | ResizeHandleId,
    e: React.PointerEvent<HTMLElement>,
  ) => {
    if (disabled) return;
    // Ignore non-primary buttons or concurrent second pointers
    if (e.button !== 0 || gestureRef.current !== null) {
      return;
    }
    e.stopPropagation();
    if (typeof e.currentTarget.setPointerCapture === "function") {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore synthetic test environments without pointer capture table
      }
    }
    gestureRef.current = {
      pointerId: e.pointerId,
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
    };
    setTick((t) => t + 1);
  };

  const updateGesture = (e: React.PointerEvent<HTMLElement>) => {
    const active = gestureRef.current;
    if (!active || active.pointerId !== e.pointerId) return;
    gestureRef.current = {
      ...active,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
    };
  };

  const finishGesture = (e: React.PointerEvent<HTMLElement>) => {
    const active = gestureRef.current;
    if (!active || active.pointerId !== e.pointerId) return;
    gestureRef.current = null;
    setTick((t) => t + 1);

    const deltaX = (e.clientX - active.startClientX) / safeZoom;
    const deltaY = (e.clientY - active.startClientY) / safeZoom;

    if (active.mode === "move") {
      const moved = moveAnnotationPoints(
        annotation,
        deltaX,
        deltaY,
        imageWidth,
        imageHeight,
      );
      const nextBounds = computeAnnotationBounds(moved);
      onMove(
        moved,
        Object.freeze({
          x: Math.round((nextBounds.x - bounds.x) * 100) / 100,
          y: Math.round((nextBounds.y - bounds.y) * 100) / 100,
        }),
      );
    } else {
      const resized = resizeAnnotationPoints(
        annotation,
        active.mode,
        deltaX,
        deltaY,
        imageWidth,
        imageHeight,
      );
      onResize(resized, active.mode, computeAnnotationBounds(resized));
    }
  };

  const cancelGesture = () => {
    if (!gestureRef.current) return;
    gestureRef.current = null;
    setTick((t) => t + 1);
    onCancel?.();
  };

  return (
    <div
      className="ferby-selection-handles"
      role="group"
      aria-label={`Selection handles for ${annotation.id}`}
      tabIndex={0}
      style={{
        left: `${bounds.x * safeZoom}px`,
        top: `${bounds.y * safeZoom}px`,
        width: `${bounds.width * safeZoom}px`,
        height: `${bounds.height * safeZoom}px`,
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancelGesture();
        }
      }}
      onPointerMove={updateGesture}
      onPointerUp={finishGesture}
      onPointerCancel={(e) => {
        if (
          gestureRef.current &&
          gestureRef.current.pointerId === e.pointerId
        ) {
          cancelGesture();
        }
      }}
    >
      <div
        role="button"
        aria-label="Move selected annotation"
        className="ferby-selection-handles__body"
        onPointerDown={(e) => startGesture("move", e)}
      />

      {ALL_RESIZE_HANDLES.map((handle) => (
        <button
          key={handle}
          type="button"
          disabled={disabled}
          aria-label={`Resize handle ${handle.toUpperCase()}`}
          data-handle={handle}
          className={`ferby-selection-handles__handle ferby-selection-handles__handle--${handle}`}
          onPointerDown={(e) => startGesture(handle, e)}
        />
      ))}
    </div>
  );
};

