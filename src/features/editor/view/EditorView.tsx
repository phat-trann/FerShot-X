import { Type } from "lucide-react";
import { Button } from "../../../components/ui/button";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  Annotation,
  AnnotationStyle,
  AnnotationTool,
  EditorViewProps,
  Point,
  Rect,
} from "../../../contracts/editor";
import { SelectionHandlesOverlay } from "../../selection-handles";
import "./EditorView.css";
import { Input } from "../../../components/ui/input";

export type SupportedCreationTool =
  | "rectangle"
  | "arrow"
  | "pen"
  | "ellipse"
  | "text"
  | "counter";

export interface EditorViewExtendedProps extends EditorViewProps {
  readonly selectedAnnotationId?: string | null;
  readonly onAnnotationUpdate?: (annotation: Annotation) => void;
  readonly zoom?: number;
  readonly disabled?: boolean;
  readonly busy?: boolean;
  readonly defaultStyle?: Readonly<AnnotationStyle>;
  readonly defaultText?: string;
}

export const DEFAULT_ANNOTATION_STYLE: Readonly<AnnotationStyle> = {
  color: "#ef4444",
  strokeWidth: 3,
  opacity: 1,
};

let moduleAnnotationSequence = 0;

export function allocateAnnotationId(
  existingAnnotations: readonly Annotation[],
): string {
  const existingIds = new Set(existingAnnotations.map((item) => item.id));
  for (const item of existingAnnotations) {
    const match = /^annotation-(\d+)$|^draft-(\d+)$/.exec(item.id);
    if (match) {
      const parsed = Number(match[1] ?? match[2]);
      if (Number.isSafeInteger(parsed) && parsed > moduleAnnotationSequence) {
        moduleAnnotationSequence = parsed;
      }
    }
  }

  const randomPart =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  let candidate = "";
  do {
    moduleAnnotationSequence += 1;
    candidate = `annotation-${moduleAnnotationSequence}-${randomPart}`;
  } while (existingIds.has(candidate));

  return candidate;
}

export function isSupportedCreationTool(
  tool: AnnotationTool,
): tool is SupportedCreationTool {
  return (
    tool === "rectangle" ||
    tool === "arrow" ||
    tool === "pen" ||
    tool === "ellipse" ||
    tool === "text" ||
    tool === "counter"
  );
}

export function clampCoordinate(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const safeMax = Math.max(0, max);
  return Math.min(safeMax, Math.max(0, value));
}

export function clientToImagePoint(
  clientX: number,
  clientY: number,
  bounds: Pick<DOMRect, "left" | "top" | "width" | "height">,
  imageWidth: number,
  imageHeight: number,
): Point {
  const safeImageWidth = Math.max(0, imageWidth);
  const safeImageHeight = Math.max(0, imageHeight);

  if (bounds.width <= 0 || bounds.height <= 0) {
    return {
      x: clampCoordinate(clientX - bounds.left, safeImageWidth),
      y: clampCoordinate(clientY - bounds.top, safeImageHeight),
    };
  }

  const scaleX = safeImageWidth / bounds.width;
  const scaleY = safeImageHeight / bounds.height;
  const rawX = (clientX - bounds.left) * scaleX;
  const rawY = (clientY - bounds.top) * scaleY;

  return {
    x: Math.round(clampCoordinate(rawX, safeImageWidth) * 100) / 100,
    y: Math.round(clampCoordinate(rawY, safeImageHeight) * 100) / 100,
  };
}

export function pointsToNormalizedRect(start: Point, end: Point): Rect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { x, y, width, height };
}

export function computeArrowHeadPoints(
  start: Point,
  end: Point,
  strokeWidth: number,
): readonly [Point, Point, Point] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const headLength = Math.max(10, strokeWidth * 4);
  const spread = Math.PI / 6;

  const wing1: Point = {
    x: Math.round((end.x - headLength * Math.cos(angle - spread)) * 100) / 100,
    y: Math.round((end.y - headLength * Math.sin(angle - spread)) * 100) / 100,
  };
  const wing2: Point = {
    x: Math.round((end.x - headLength * Math.cos(angle + spread)) * 100) / 100,
    y: Math.round((end.y - headLength * Math.sin(angle + spread)) * 100) / 100,
  };

  return [end, wing1, wing2];
}

export function appendUniqueEndpoint(
  points: readonly Point[],
  endPoint: Point,
): readonly Point[] {
  if (points.length === 0) {
    return [endPoint];
  }
  const last = points[points.length - 1];
  if (last && last.x === endPoint.x && last.y === endPoint.y) {
    return points;
  }
  return [...points, endPoint];
}

interface DraftGesture {
  readonly pointerId: number;
  readonly tool: SupportedCreationTool;
  readonly zoom: number;
  readonly bounds: Pick<DOMRect, "left" | "top" | "width" | "height">;
  readonly points: readonly Point[];
}

function trySetPointerCapture(
  element: SVGSVGElement | null,
  pointerId: number,
): void {
  if (!element || typeof element.setPointerCapture !== "function") {
    return;
  }
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Ignore synthetic test environments where pointerId is not an active hardware pointer
  }
}

function tryReleasePointerCapture(
  element: SVGSVGElement | null,
  pointerId: number,
): void {
  if (!element || typeof element.releasePointerCapture !== "function") {
    return;
  }
  try {
    if (
      typeof element.hasPointerCapture !== "function" ||
      element.hasPointerCapture(pointerId)
    ) {
      element.releasePointerCapture(pointerId);
    }
  } catch {
    // Ignore synthetic test environments
  }
}

function annotationToSelectionProxy(
  annotation: Annotation,
  imageWidth: number,
  imageHeight: number,
): Annotation {
  if (annotation.points.length === 1) {
    const pt = annotation.points[0];
    return Object.freeze({
      ...annotation,
      points: Object.freeze([
        Object.freeze({ x: pt.x, y: pt.y }),
        Object.freeze({
          x: Math.min(imageWidth, pt.x + 24),
          y: Math.min(imageHeight, pt.y + 24),
        }),
      ]),
    });
  }
  return annotation;
}

function applySelectionProxyToAnnotation(
  original: Annotation,
  transformedProxy: Annotation,
): Annotation {
  const nextPoints =
    original.points.length === 1
      ? Object.freeze([Object.freeze({ ...transformedProxy.points[0] })])
      : transformedProxy.points;
  return Object.freeze({
    ...original,
    points: nextPoints,
  });
}

function renderAnnotationShape(
  annotation: Annotation,
  onSelect?: (event: React.MouseEvent<SVGElement>) => void,
): React.JSX.Element | null {
  const { id, tool, points, style } = annotation;
  if (points.length === 0 || !isSupportedCreationTool(tool)) {
    return null;
  }

  const commonProps = {
    "data-testid": `annotation-${id}`,
    "data-annotation-tool": tool,
    className: "fershot-editor-view__annotation",
    stroke: style.color,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    onClick: onSelect,
  };

  if (tool === "rectangle") {
    const first = points[0];
    const last = points[points.length - 1] ?? first;
    const rect = pointsToNormalizedRect(first, last);
    return (
      <rect
        key={id}
        {...commonProps}
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill="none"
      />
    );
  }

  if (tool === "ellipse") {
    const first = points[0];
    const last = points[points.length - 1] ?? first;
    const rect = pointsToNormalizedRect(first, last);
    const rx = rect.width / 2;
    const ry = rect.height / 2;
    return (
      <ellipse
        key={id}
        {...commonProps}
        cx={rect.x + rx}
        cy={rect.y + ry}
        rx={rx}
        ry={ry}
        fill="none"
      />
    );
  }

  if (tool === "arrow") {
    const first = points[0];
    const last = points[points.length - 1] ?? first;
    const headPoints = computeArrowHeadPoints(first, last, style.strokeWidth);
    const polygonPoints = headPoints
      .map((pt) => `${pt.x},${pt.y}`)
      .join(" ");
    return (
      <g key={id} {...commonProps}>
        <line
          data-testid={`annotation-${id}-shaft`}
          x1={first.x}
          y1={first.y}
          x2={last.x}
          y2={last.y}
          strokeLinecap="round"
        />
        <polygon
          data-testid={`annotation-${id}-head`}
          points={polygonPoints}
          fill={style.color}
          stroke={style.color}
          strokeLinejoin="round"
        />
      </g>
    );
  }

  if (tool === "text") {
    const first = points[0];
    const fontSize = Math.max(14, style.strokeWidth * 6);
    return (
      <text
        key={id}
        {...commonProps}
        x={first.x}
        y={first.y}
        fill={style.color}
        stroke="none"
        fontSize={fontSize}
        fontWeight="bold"
        dominantBaseline="hanging"
      >
        {annotation.text ?? ""}
      </text>
    );
  }

  if (tool === "counter") {
    const first = points[0];
    const radius = Math.max(12, style.strokeWidth * 4);
    return (
      <g key={id} {...commonProps}>
        <circle
          cx={first.x}
          cy={first.y}
          r={radius}
          fill={style.color}
          stroke="none"
        />
        <text
          x={first.x}
          y={first.y}
          fill="#ffffff"
          stroke="none"
          fontSize={radius}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {String(annotation.counter ?? 1)}
        </text>
      </g>
    );
  }

  const pointStr = points.map((pt) => `${pt.x},${pt.y}`).join(" ");
  return (
    <polyline
      key={id}
      {...commonProps}
      points={pointStr}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function EditorView({
  imageSrc,
  imageWidth,
  imageHeight,
  annotations,
  tool,
  onAnnotationCreate,
  onAnnotationSelect,
  selectedAnnotationId,
  onAnnotationUpdate,
  zoom,
  disabled = false,
  busy = false,
  defaultStyle = DEFAULT_ANNOTATION_STYLE,
  defaultText = "",
}: EditorViewExtendedProps): React.JSX.Element {
  const isBlocked = Boolean(disabled || busy);
  const safeZoom =
    zoom !== undefined && Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draftRef = useRef<DraftGesture | null>(null);
  const boundsInvalidatedRef = useRef<boolean>(false);
  const inlineTextOpenRef = useRef<boolean>(false);
  const [draft, setDraft] = useState<DraftGesture | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null,
  );
  const [transformPreview, setTransformPreview] = useState<Annotation | null>(
    null,
  );
  const [inlineTextDraft, setInlineTextDraft] = useState<{
    readonly point: Point;
    readonly text: string;
  } | null>(null);

  const clearActiveDraft = (releaseCapture: boolean) => {
    const active = draftRef.current;
    boundsInvalidatedRef.current = false;
    if (active) {
      draftRef.current = null;
      if (releaseCapture) {
        tryReleasePointerCapture(svgRef.current, active.pointerId);
      }
    }
    setDraft(null);
  };

  const clearInlineTextDraft = () => {
    inlineTextOpenRef.current = false;
    setInlineTextDraft(null);
  };

  useEffect(() => {
    if (isBlocked) {
      clearActiveDraft(true);
      clearInlineTextDraft();
      setTransformPreview(null);
    }
  }, [isBlocked]);

  useEffect(() => {
    clearActiveDraft(true);
    clearInlineTextDraft();
    setTransformPreview(null);
    setInternalSelectedId(null);
  }, [imageSrc, imageWidth, imageHeight]);

  useEffect(() => {
    clearActiveDraft(true);
    clearInlineTextDraft();
    setTransformPreview(null);
  }, [tool, safeZoom]);

  useEffect(() => {
    const invalidateCachedBounds = () => {
      if (draftRef.current) {
        boundsInvalidatedRef.current = true;
      }
    };
    window.addEventListener("resize", invalidateCachedBounds);
    window.addEventListener("scroll", invalidateCachedBounds, true);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver === "function" && svgRef.current) {
      let skipInitialCallback = true;
      observer = new ResizeObserver(() => {
        if (skipInitialCallback) {
          skipInitialCallback = false;
          return;
        }
        if (draftRef.current) {
          boundsInvalidatedRef.current = true;
        }
      });
      observer.observe(svgRef.current);
    }

    return () => {
      window.removeEventListener("resize", invalidateCachedBounds);
      window.removeEventListener("scroll", invalidateCachedBounds, true);
      observer?.disconnect();
    };
  }, []);

  useEffect(
    () => () => {
      const active = draftRef.current;
      if (active) {
        draftRef.current = null;
        tryReleasePointerCapture(svgRef.current, active.pointerId);
      }
    },
    [],
  );

  const activeSelectedId =
    selectedAnnotationId !== undefined
      ? selectedAnnotationId
      : internalSelectedId;
  const selectedAnnotation = useMemo(
    () => annotations.find((item) => item.id === activeSelectedId) ?? null,
    [annotations, activeSelectedId],
  );

  const unsupportedActiveTool =
    tool !== "select" && !isSupportedCreationTool(tool);
  const unsupportedSuppliedTools = useMemo(
    () =>
      Array.from(
        new Set(
          annotations
            .filter((item) => !isSupportedCreationTool(item.tool))
            .map((item) => item.tool),
        ),
      ),
    [annotations],
  );

  const selectAnnotation = (id: string | null) => {
    setInternalSelectedId(id);
    onAnnotationSelect(id);
  };

  const captureOverlayBounds = (): Pick<
    DOMRect,
    "left" | "top" | "width" | "height"
  > => {
    const rawRect = svgRef.current?.getBoundingClientRect();
    return rawRect && rawRect.width > 0 && rawRect.height > 0
      ? {
          left: rawRect.left,
          top: rawRect.top,
          width: rawRect.width,
          height: rawRect.height,
        }
      : {
          left: rawRect?.left ?? 0,
          top: rawRect?.top ?? 0,
          width: imageWidth * safeZoom,
          height: imageHeight * safeZoom,
        };
  };

  const resolvePointWithBounds = (
    event: React.PointerEvent<SVGSVGElement>,
    bounds: Pick<DOMRect, "left" | "top" | "width" | "height">,
  ): Point =>
    clientToImagePoint(
      event.clientX,
      event.clientY,
      bounds,
      imageWidth,
      imageHeight,
    );

  const commitInlineText = (point: Point, textValue: string) => {
    if (!inlineTextOpenRef.current) {
      return;
    }
    inlineTextOpenRef.current = false;
    const trimmed = textValue.trim();
    setInlineTextDraft(null);
    if (!trimmed || isBlocked || tool !== "text") {
      return;
    }
    const created: Annotation = {
      id: allocateAnnotationId(annotations),
      tool: "text",
      points: [point],
      style: { ...defaultStyle },
      text: trimmed,
    };
    setInternalSelectedId(created.id);
    onAnnotationCreate(created);
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (isBlocked || event.button !== 0 || draftRef.current !== null) {
      return;
    }
    if (tool === "select") {
      if (event.target === svgRef.current) {
        selectAnnotation(null);
      }
      return;
    }
    if (!isSupportedCreationTool(tool)) {
      return;
    }

    boundsInvalidatedRef.current = false;
    const bounds = captureOverlayBounds();
    const startPoint = resolvePointWithBounds(event, bounds);
    trySetPointerCapture(svgRef.current, event.pointerId);
    const nextDraft: DraftGesture = {
      pointerId: event.pointerId,
      tool,
      zoom: safeZoom,
      bounds,
      points: [startPoint],
    };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (isBlocked) {
      clearActiveDraft(true);
      return;
    }
    const active = draftRef.current;
    if (!active || event.pointerId !== active.pointerId) {
      return;
    }
    if (active.tool !== tool || active.zoom !== safeZoom) {
      clearActiveDraft(true);
      return;
    }
    let effectiveBounds = active.bounds;
    if (boundsInvalidatedRef.current) {
      boundsInvalidatedRef.current = false;
      effectiveBounds = captureOverlayBounds();
    }
    const currentPoint = resolvePointWithBounds(event, effectiveBounds);
    const lastPoint = active.points[active.points.length - 1];
    if (
      lastPoint &&
      lastPoint.x === currentPoint.x &&
      lastPoint.y === currentPoint.y &&
      effectiveBounds === active.bounds
    ) {
      return;
    }

    const nextPoints =
      active.tool === "pen"
        ? appendUniqueEndpoint(active.points, currentPoint)
        : active.tool === "text" || active.tool === "counter"
          ? [currentPoint]
          : [active.points[0], currentPoint];

    const nextDraft: DraftGesture = {
      ...active,
      bounds: effectiveBounds,
      points: nextPoints,
    };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const active = draftRef.current;
    if (!active || event.pointerId !== active.pointerId) {
      return;
    }
    const wasInvalidated = boundsInvalidatedRef.current;
    boundsInvalidatedRef.current = false;
    draftRef.current = null;
    setDraft(null);
    tryReleasePointerCapture(svgRef.current, active.pointerId);
    if (isBlocked || active.tool !== tool || active.zoom !== safeZoom) {
      return;
    }
    const effectiveBounds = wasInvalidated
      ? captureOverlayBounds()
      : active.bounds;
    const endPoint = resolvePointWithBounds(event, effectiveBounds);
    const activeTool = active.tool;
    const finalPoints =
      activeTool === "pen"
        ? appendUniqueEndpoint(active.points, endPoint)
        : activeTool === "text" || activeTool === "counter"
          ? [endPoint]
          : [active.points[0], endPoint];

    if (activeTool === "text") {
      inlineTextOpenRef.current = true;
      setInlineTextDraft({
        point: endPoint,
        text: defaultText,
      });
      return;
    }

    if (activeTool === "counter") {
      const nextCounterVal =
        Math.max(
          0,
          ...annotations
            .filter((item) => item.tool === "counter")
            .map((item) => item.counter ?? 0),
        ) + 1;
      const created: Annotation = {
        id: allocateAnnotationId(annotations),
        tool: "counter",
        points: [endPoint],
        style: { ...defaultStyle },
        counter: nextCounterVal,
      };
      setInternalSelectedId(created.id);
      onAnnotationCreate(created);
      return;
    }

    const start = finalPoints[0];
    const end = finalPoints[finalPoints.length - 1] ?? start;
    const moved =
      Math.hypot(end.x - start.x, end.y - start.y) > 0 ||
      (activeTool === "pen" && finalPoints.length >= 2);

    if (!moved) {
      return;
    }

    const created: Annotation = {
      id: allocateAnnotationId(annotations),
      tool: activeTool,
      points: finalPoints,
      style: { ...defaultStyle },
    };
    setInternalSelectedId(created.id);
    onAnnotationCreate(created);
  };

  const handlePointerCancel = (event: React.PointerEvent<SVGSVGElement>) => {
    const active = draftRef.current;
    if (!active || event.pointerId !== active.pointerId) {
      return;
    }
    clearActiveDraft(true);
  };

  const handleLostPointerCapture = (
    event: React.PointerEvent<SVGSVGElement>,
  ) => {
    const active = draftRef.current;
    if (!active || event.pointerId !== active.pointerId) {
      return;
    }
    clearActiveDraft(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (draftRef.current) {
        clearActiveDraft(true);
      } else if (inlineTextDraft) {
        clearInlineTextDraft();
      } else if (tool === "select") {
        selectAnnotation(null);
      }
    }
  };

  const draftPreviewAnnotation: Annotation | null =
    draft && draft.tool !== "text" && draft.tool !== "counter"
      ? {
          id: "draft-preview",
          tool: draft.tool,
          points: draft.points,
          style: defaultStyle,
        }
      : null;

  const selectedProxy = useMemo(
    () =>
      selectedAnnotation
        ? annotationToSelectionProxy(
            selectedAnnotation,
            imageWidth,
            imageHeight,
          )
        : null,
    [selectedAnnotation, imageWidth, imageHeight],
  );

  return (
    <div
      className="fershot-editor-view"
      data-tool={tool}
      aria-busy={busy || undefined}
      aria-disabled={isBlocked || undefined}
    >
      {unsupportedActiveTool && (
        <p className="fershot-editor-view__banner" role="status">
          Tool &ldquo;{tool}&rdquo; is not supported for interactive creation in
          this view yet.
        </p>
      )}
      {unsupportedSuppliedTools.length > 0 && (
        <p className="fershot-editor-view__banner" role="status">
          Unsupported annotation tool(s) omitted from rendering:{" "}
          {unsupportedSuppliedTools.join(", ")}.
        </p>
      )}

      <div className="fershot-editor-view__stage">
        <img
          className="fershot-editor-view__image"
          src={imageSrc}
          width={imageWidth}
          height={imageHeight}
          alt="Editor canvas"
        />
        <svg
          ref={svgRef}
          className={`fershot-editor-view__overlay ${
            tool === "select" ? "fershot-editor-view__overlay--select" : ""
          }`}
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          role="application"
          aria-label="Annotation canvas overlay"
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handleLostPointerCapture}
          onKeyDown={handleKeyDown}
        >
          {annotations.map((annotation) => {
            const effectiveAnnotation =
              transformPreview &&
              selectedAnnotation &&
              annotation.id === selectedAnnotation.id
                ? applySelectionProxyToAnnotation(
                    selectedAnnotation,
                    transformPreview,
                  )
                : annotation;
            return renderAnnotationShape(effectiveAnnotation, (event) => {
              if (!isBlocked && tool === "select") {
                event.stopPropagation();
                selectAnnotation(annotation.id);
              }
            });
          })}
          {draftPreviewAnnotation
            ? renderAnnotationShape(draftPreviewAnnotation)
            : null}
        </svg>

        {inlineTextDraft && (
          <div
            className="fershot-editor-view__inline-text"
            style={{
              left: `${(inlineTextDraft.point.x / Math.max(1, imageWidth)) * 100}%`,
              top: `${(inlineTextDraft.point.y / Math.max(1, imageHeight)) * 100}%`,
            }}
          >
            <Input
              type="text"
              aria-label="Inline annotation text"
              className="fershot-editor-view__inline-input"
              autoFocus
              disabled={isBlocked}
              value={inlineTextDraft.text}
              onChange={(e) =>
                setInlineTextDraft((prev) =>
                  prev ? { ...prev, text: e.target.value } : null,
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  clearInlineTextDraft();
                } else if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  commitInlineText(
                    inlineTextDraft.point,
                    inlineTextDraft.text,
                  );
                }
              }}
            />
            <Button icon={Type} variant="secondary"
              type="button"
              disabled={isBlocked || !inlineTextDraft.text.trim()}
              onClick={() =>
                commitInlineText(inlineTextDraft.point, inlineTextDraft.text)
              }
            >
              Apply Text
            </Button>
          </div>
        )}

        {selectedAnnotation && selectedProxy && (
          <SelectionHandlesOverlay
            annotation={selectedProxy}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            zoom={zoom}
            disabled={disabled}
            busy={busy}
            onPreviewChange={(preview) => setTransformPreview(preview)}
            onMove={(movedProxy) => {
              setTransformPreview(null);
              const updated = applySelectionProxyToAnnotation(
                selectedAnnotation,
                movedProxy,
              );
              onAnnotationUpdate?.(updated);
            }}
            onResize={(resizedProxy) => {
              setTransformPreview(null);
              const updated = applySelectionProxyToAnnotation(
                selectedAnnotation,
                resizedProxy,
              );
              onAnnotationUpdate?.(updated);
            }}
            onCancel={() => setTransformPreview(null)}
          />
        )}
      </div>
    </div>
  );
}
