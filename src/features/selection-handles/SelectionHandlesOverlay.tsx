import React, { useEffect, useMemo, useRef, useState } from "react";
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
  readonly busy?: boolean;
  readonly onMove: (next: Annotation, deltaImagePx: Readonly<Point>) => void;
  readonly onResize: (
    next: Annotation,
    handle: ResizeHandleId,
    boundsImagePx: Readonly<Rect>,
  ) => void;
  readonly onPreviewChange?: (preview: Annotation | null) => void;
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

function moveAnnotationPointsWithBounds(
  annotation: Readonly<Annotation>,
  bounds: Readonly<Rect>,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
): Annotation {
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
  return moveAnnotationPointsWithBounds(
    annotation,
    bounds,
    deltaX,
    deltaY,
    imageWidth,
    imageHeight,
  );
}

function resizeAnnotationPointsWithBounds(
  annotation: Readonly<Annotation>,
  bounds: Readonly<Rect>,
  handle: ResizeHandleId,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
): Annotation {
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
  return resizeAnnotationPointsWithBounds(
    annotation,
    bounds,
    handle,
    deltaX,
    deltaY,
    imageWidth,
    imageHeight,
  );
}

function pointsAreIdentical(
  a: readonly Point[],
  b: readonly Point[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const pa = a[i];
    const pb = b[i];
    if (!pa || !pb || pa.x !== pb.x || pa.y !== pb.y) {
      return false;
    }
  }
  return true;
}

interface ResolvedStageGeometry {
  readonly originLeft: number;
  readonly originTop: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

interface ActiveGesture {
  readonly pointerId: number;
  readonly mode: "move" | ResizeHandleId;
  readonly zoom: number;
  readonly captureTarget: HTMLElement | null;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly lastClientX: number;
  readonly lastClientY: number;
  readonly originLeft: number;
  readonly originTop: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly currentOriginLeft: number;
  readonly currentOriginTop: number;
  readonly currentScaleX: number;
  readonly currentScaleY: number;
  readonly baseAnnotation: Readonly<Annotation>;
  readonly baseBounds: Readonly<Rect>;
  readonly previewAnnotation: Annotation | null;
  readonly previewBounds: Readonly<Rect>;
}

export const SelectionHandlesOverlay: React.FC<SelectionHandlesOverlayProps> = ({
  annotation,
  imageWidth,
  imageHeight,
  zoom,
  disabled = false,
  busy = false,
  onMove,
  onResize,
  onPreviewChange,
  onCancel,
}) => {
  const isBlocked = Boolean(disabled || busy);
  const safeZoom =
    zoom !== undefined && Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const groupRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<ActiveGesture | null>(null);
  const geometryInvalidatedRef = useRef<boolean>(false);
  const [, setTick] = useState(0);

  const baseBounds = useMemo(
    () => computeAnnotationBounds(annotation),
    [annotation],
  );

  const resolveGeometry = (): ResolvedStageGeometry => {
    const parent = groupRef.current?.parentElement;
    if (parent && imageWidth > 0 && imageHeight > 0) {
      const siblingSvg = parent.querySelector("svg");
      const svgRect = siblingSvg?.getBoundingClientRect();
      if (svgRect && svgRect.width > 0 && svgRect.height > 0) {
        return {
          originLeft: svgRect.left,
          originTop: svgRect.top,
          scaleX: svgRect.width / imageWidth,
          scaleY: svgRect.height / imageHeight,
        };
      }
      const parentRect = parent.getBoundingClientRect();
      if (parentRect && parentRect.width > 0 && parentRect.height > 0) {
        return {
          originLeft: parentRect.left,
          originTop: parentRect.top,
          scaleX: parentRect.width / imageWidth,
          scaleY: parentRect.height / imageHeight,
        };
      }
    }
    return {
      originLeft: 0,
      originTop: 0,
      scaleX: safeZoom,
      scaleY: safeZoom,
    };
  };

  const computeTransformedFromGesture = (
    active: ActiveGesture,
    clientX: number,
    clientY: number,
  ): Annotation => {
    const startImgX =
      (active.startClientX - active.originLeft) / active.scaleX;
    const startImgY =
      (active.startClientY - active.originTop) / active.scaleY;
    const currImgX =
      (clientX - active.currentOriginLeft) / active.currentScaleX;
    const currImgY =
      (clientY - active.currentOriginTop) / active.currentScaleY;
    const deltaX = currImgX - startImgX;
    const deltaY = currImgY - startImgY;
    if (active.mode === "move") {
      return moveAnnotationPointsWithBounds(
        active.baseAnnotation,
        active.baseBounds,
        deltaX,
        deltaY,
        imageWidth,
        imageHeight,
      );
    }
    return resizeAnnotationPointsWithBounds(
      active.baseAnnotation,
      active.baseBounds,
      active.mode,
      deltaX,
      deltaY,
      imageWidth,
      imageHeight,
    );
  };

  const activeGesture = isBlocked ? null : gestureRef.current;
  const bounds = activeGesture ? activeGesture.previewBounds : baseBounds;

  const releaseCaptureOnTarget = (
    target: HTMLElement | null,
    pointerId: number,
  ) => {
    for (const candidate of [target, groupRef.current]) {
      if (!candidate || typeof candidate.releasePointerCapture !== "function") {
        continue;
      }
      try {
        if (
          typeof candidate.hasPointerCapture !== "function" ||
          candidate.hasPointerCapture(pointerId)
        ) {
          candidate.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignore synthetic environments
      }
    }
  };

  const cancelGesture = () => {
    const active = gestureRef.current;
    geometryInvalidatedRef.current = false;
    if (!active) return;
    gestureRef.current = null;
    releaseCaptureOnTarget(active.captureTarget, active.pointerId);
    setTick((t) => t + 1);
    onPreviewChange?.(null);
    onCancel?.();
  };

  useEffect(() => {
    if (isBlocked && gestureRef.current) {
      const active = gestureRef.current;
      geometryInvalidatedRef.current = false;
      gestureRef.current = null;
      releaseCaptureOnTarget(active.captureTarget, active.pointerId);
      setTick((t) => t + 1);
      onPreviewChange?.(null);
      onCancel?.();
    }
  }, [isBlocked, onPreviewChange, onCancel]);

  useEffect(() => {
    if (gestureRef.current) {
      const active = gestureRef.current;
      geometryInvalidatedRef.current = false;
      gestureRef.current = null;
      releaseCaptureOnTarget(active.captureTarget, active.pointerId);
      setTick((t) => t + 1);
      onPreviewChange?.(null);
      onCancel?.();
    }
    // Abort in-flight gesture if target annotation ID, source dimensions, or zoom change mid-drag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotation.id, imageWidth, imageHeight, safeZoom]);

  useEffect(() => {
    const invalidateCachedGeometry = () => {
      if (gestureRef.current) {
        geometryInvalidatedRef.current = true;
      }
    };
    window.addEventListener("resize", invalidateCachedGeometry);
    window.addEventListener("scroll", invalidateCachedGeometry, true);

    let observer: ResizeObserver | null = null;
    const parent = groupRef.current?.parentElement;
    if (typeof ResizeObserver === "function" && parent) {
      let skipInitialCallback = true;
      observer = new ResizeObserver(() => {
        if (skipInitialCallback) {
          skipInitialCallback = false;
          return;
        }
        if (gestureRef.current) {
          geometryInvalidatedRef.current = true;
        }
      });
      observer.observe(parent);
    }

    return () => {
      window.removeEventListener("resize", invalidateCachedGeometry);
      window.removeEventListener("scroll", invalidateCachedGeometry, true);
      observer?.disconnect();
    };
  }, []);

  useEffect(
    () => () => {
      const active = gestureRef.current;
      if (active) {
        gestureRef.current = null;
        releaseCaptureOnTarget(active.captureTarget, active.pointerId);
      }
    },
    [],
  );

  const startGesture = (
    mode: "move" | ResizeHandleId,
    e: React.PointerEvent<HTMLElement>,
  ) => {
    if (isBlocked) return;
    // Ignore non-primary buttons or concurrent second pointers
    if (e.button !== 0 || gestureRef.current !== null) {
      return;
    }
    e.stopPropagation();
    const captureTarget = groupRef.current ?? e.currentTarget;
    if (typeof captureTarget.setPointerCapture === "function") {
      try {
        captureTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore synthetic test environments without pointer capture table
      }
    }
    geometryInvalidatedRef.current = false;
    const geom = resolveGeometry();
    gestureRef.current = {
      pointerId: e.pointerId,
      mode,
      zoom: safeZoom,
      captureTarget,
      startClientX: e.clientX,
      startClientY: e.clientY,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      originLeft: geom.originLeft,
      originTop: geom.originTop,
      scaleX: geom.scaleX,
      scaleY: geom.scaleY,
      currentOriginLeft: geom.originLeft,
      currentOriginTop: geom.originTop,
      currentScaleX: geom.scaleX,
      currentScaleY: geom.scaleY,
      baseAnnotation: annotation,
      baseBounds,
      previewAnnotation: null,
      previewBounds: baseBounds,
    };
    setTick((t) => t + 1);
  };

  const updateGesture = (e: React.PointerEvent<HTMLElement>) => {
    if (isBlocked) {
      cancelGesture();
      return;
    }
    const active = gestureRef.current;
    if (!active || active.pointerId !== e.pointerId) return;
    if (active.zoom !== safeZoom) {
      cancelGesture();
      return;
    }
    const wasInvalidated = geometryInvalidatedRef.current;
    if (
      !wasInvalidated &&
      active.lastClientX === e.clientX &&
      active.lastClientY === e.clientY
    ) {
      return;
    }
    let effectiveActive = active;
    if (wasInvalidated) {
      geometryInvalidatedRef.current = false;
      const freshGeom = resolveGeometry();
      effectiveActive = {
        ...active,
        currentOriginLeft: freshGeom.originLeft,
        currentOriginTop: freshGeom.originTop,
        currentScaleX: freshGeom.scaleX,
        currentScaleY: freshGeom.scaleY,
      };
    }
    const nextPreview = computeTransformedFromGesture(
      effectiveActive,
      e.clientX,
      e.clientY,
    );
    const currentPoints =
      effectiveActive.previewAnnotation?.points ??
      effectiveActive.baseAnnotation.points;
    if (pointsAreIdentical(currentPoints, nextPreview.points)) {
      gestureRef.current = {
        ...effectiveActive,
        lastClientX: e.clientX,
        lastClientY: e.clientY,
      };
      return;
    }
    const nextBounds = computeAnnotationBounds(nextPreview);
    gestureRef.current = {
      ...effectiveActive,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      previewAnnotation: nextPreview,
      previewBounds: nextBounds,
    };
    setTick((t) => t + 1);
    onPreviewChange?.(nextPreview);
  };

  const finishGesture = (e: React.PointerEvent<HTMLElement>) => {
    if (isBlocked) {
      cancelGesture();
      return;
    }
    const active = gestureRef.current;
    if (!active || active.pointerId !== e.pointerId) return;
    if (active.zoom !== safeZoom) {
      cancelGesture();
      return;
    }
    const wasInvalidated = geometryInvalidatedRef.current;
    geometryInvalidatedRef.current = false;
    gestureRef.current = null;
    releaseCaptureOnTarget(active.captureTarget, active.pointerId);
    setTick((t) => t + 1);
    onPreviewChange?.(null);

    const effectiveActive = wasInvalidated
      ? (() => {
          const freshGeom = resolveGeometry();
          return {
            ...active,
            currentOriginLeft: freshGeom.originLeft,
            currentOriginTop: freshGeom.originTop,
            currentScaleX: freshGeom.scaleX,
            currentScaleY: freshGeom.scaleY,
          };
        })()
      : active;

    const finalized =
      !wasInvalidated &&
      effectiveActive.lastClientX === e.clientX &&
      effectiveActive.lastClientY === e.clientY &&
      effectiveActive.previewAnnotation
        ? effectiveActive.previewAnnotation
        : computeTransformedFromGesture(effectiveActive, e.clientX, e.clientY);

    if (pointsAreIdentical(active.baseAnnotation.points, finalized.points)) {
      return;
    }

    const nextBounds =
      finalized === active.previewAnnotation
        ? active.previewBounds
        : computeAnnotationBounds(finalized);

    if (active.mode === "move") {
      onMove(
        finalized,
        Object.freeze({
          x: Math.round((nextBounds.x - active.baseBounds.x) * 100) / 100,
          y: Math.round((nextBounds.y - active.baseBounds.y) * 100) / 100,
        }),
      );
    } else {
      onResize(finalized, active.mode, nextBounds);
    }
  };

  return (
    <div
      ref={groupRef}
      className="fershot-selection-handles"
      role="group"
      aria-label={`Selection handles for ${annotation.id}`}
      aria-disabled={isBlocked}
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
      onLostPointerCapture={(e) => {
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
        aria-disabled={isBlocked}
        className="fershot-selection-handles__body"
        onPointerDown={(e) => startGesture("move", e)}
      />

      {ALL_RESIZE_HANDLES.map((handle) => (
        <button
          key={handle}
          type="button"
          disabled={isBlocked}
          aria-label={`Resize handle ${handle.toUpperCase()}`}
          data-handle={handle}
          className={`fershot-selection-handles__handle fershot-selection-handles__handle--${handle}`}
          onPointerDown={(e) => startGesture(handle, e)}
        />
      ))}
    </div>
  );
};

