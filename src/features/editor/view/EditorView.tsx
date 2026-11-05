import React, { useRef, useState } from "react";
import type {
  Annotation,
  AnnotationStyle,
  AnnotationTool,
  EditorViewProps,
  Point,
  Rect,
} from "../../../contracts/editor";
import "./EditorView.css";

export type SupportedCreationTool = "rectangle" | "arrow" | "pen";

export const DEFAULT_ANNOTATION_STYLE: Readonly<AnnotationStyle> = {
  color: "#ef4444",
  strokeWidth: 3,
  opacity: 1,
};

export function isSupportedCreationTool(
  tool: AnnotationTool,
): tool is SupportedCreationTool {
  return tool === "rectangle" || tool === "arrow" || tool === "pen";
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

interface DraftGesture {
  readonly tool: SupportedCreationTool;
  readonly points: readonly Point[];
}

function renderAnnotationShape(
  annotation: Annotation,
  onSelect?: (event: React.MouseEvent<SVGElement>) => void,
): React.JSX.Element | null {
  const { id, tool, points, style } = annotation;
  if (points.length === 0) {
    return null;
  }

  const commonProps = {
    "data-testid": `annotation-${id}`,
    "data-annotation-tool": tool,
    className: "ferby-editor-view__annotation",
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

  if (tool === "arrow") {
    const first = points[0];
    const last = points[points.length - 1] ?? first;
    return (
      <line
        key={id}
        {...commonProps}
        x1={first.x}
        y1={first.y}
        x2={last.x}
        y2={last.y}
        strokeLinecap="round"
      />
    );
  }

  if (tool === "pen") {
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

  const anchor = points[0];
  return (
    <circle
      key={id}
      {...commonProps}
      cx={anchor.x}
      cy={anchor.y}
      r={Math.max(4, style.strokeWidth * 2)}
      fill="none"
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
}: EditorViewProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nextIdCounterRef = useRef(1);
  const [draft, setDraft] = useState<DraftGesture | null>(null);

  const unsupportedTool = tool !== "select" && !isSupportedCreationTool(tool);

  const resolvePoint = (
    event: React.PointerEvent<SVGSVGElement>,
  ): Point => {
    const rect = svgRef.current?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: imageWidth,
      height: imageHeight,
    };
    return clientToImagePoint(
      event.clientX,
      event.clientY,
      rect,
      imageWidth,
      imageHeight,
    );
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }
    if (tool === "select") {
      if (event.target === svgRef.current) {
        onAnnotationSelect(null);
      }
      return;
    }
    if (!isSupportedCreationTool(tool)) {
      return;
    }

    const startPoint = resolvePoint(event);
    setDraft({
      tool,
      points: [startPoint],
    });
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draft) {
      return;
    }
    const currentPoint = resolvePoint(event);
    setDraft((prev) => {
      if (!prev) {
        return null;
      }
      if (prev.tool === "pen") {
        return {
          ...prev,
          points: [...prev.points, currentPoint],
        };
      }
      return {
        ...prev,
        points: [prev.points[0], currentPoint],
      };
    });
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draft) {
      return;
    }
    const endPoint = resolvePoint(event);
    const finalPoints =
      draft.tool === "pen"
        ? draft.points.length > 1
          ? draft.points
          : [draft.points[0], endPoint]
        : [draft.points[0], endPoint];

    setDraft(null);

    const start = finalPoints[0];
    const end = finalPoints[finalPoints.length - 1] ?? start;
    const moved =
      Math.hypot(end.x - start.x, end.y - start.y) > 0 ||
      (draft.tool === "pen" && finalPoints.length > 2);

    if (!moved) {
      return;
    }

    const created: Annotation = {
      id: `draft-${nextIdCounterRef.current++}`,
      tool: draft.tool,
      points: finalPoints,
      style: { ...DEFAULT_ANNOTATION_STYLE },
    };
    onAnnotationCreate(created);
  };

  const handleCancel = () => {
    if (draft) {
      setDraft(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (draft) {
        setDraft(null);
      } else if (tool === "select") {
        onAnnotationSelect(null);
      }
    }
  };

  const draftPreviewAnnotation: Annotation | null = draft
    ? {
        id: "draft-preview",
        tool: draft.tool,
        points: draft.points,
        style: DEFAULT_ANNOTATION_STYLE,
      }
    : null;

  return (
    <div className="ferby-editor-view" data-tool={tool}>
      {unsupportedTool && (
        <p className="ferby-editor-view__banner" role="status">
          Tool &ldquo;{tool}&rdquo; is not supported for interactive creation in
          this view yet.
        </p>
      )}

      <div className="ferby-editor-view__stage">
        <img
          className="ferby-editor-view__image"
          src={imageSrc}
          width={imageWidth}
          height={imageHeight}
          alt="Editor canvas"
        />
        <svg
          ref={svgRef}
          className={`ferby-editor-view__overlay ${
            tool === "select" ? "ferby-editor-view__overlay--select" : ""
          }`}
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          role="application"
          aria-label="Annotation canvas overlay"
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handleCancel}
          onKeyDown={handleKeyDown}
        >
          {annotations.map((annotation) =>
            renderAnnotationShape(annotation, (event) => {
              if (tool === "select") {
                event.stopPropagation();
                onAnnotationSelect(annotation.id);
              }
            }),
          )}
          {draftPreviewAnnotation
            ? renderAnnotationShape(draftPreviewAnnotation)
            : null}
        </svg>
      </div>
    </div>
  );
}

