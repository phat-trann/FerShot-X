import React, { useEffect, useRef, useState } from "react";
import type {
  Annotation,
  AnnotationStyle,
  Point,
  Rect,
} from "../../contracts/editor";

export type ShapePrimitiveKind = "ellipse" | "line";

export interface EllipseGeometry {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly bounds: Rect;
}

export interface LineGeometry {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly length: number;
  readonly bounds: Rect;
}

export interface ShapePrimitiveAnnotation {
  readonly id: string;
  readonly kind: ShapePrimitiveKind;
  readonly points: readonly [Point, Point];
  readonly style: AnnotationStyle;
}

/**
 * Documented adapter proposal for Codex C12 integration:
 * - `"ellipse"` already exists in the frozen `AnnotationTool` union in `src/contracts/editor.ts`
 *   and maps 1:1 via `toContractEllipseAnnotation`.
 * - `"line"` is intentionally NOT mapped to `"arrow"` (which would misrender an arrowhead).
 *   Codex C12 should extend `AnnotationTool` in `src/contracts/editor.ts` with `"line"`
 *   before converting `kind === "line"` shapes into shared `Annotation` records.
 */
export const SHAPE_CONTRACT_ADAPTER_PROPOSAL = Object.freeze({
  existingContractTools: Object.freeze(["ellipse"] as const),
  proposedContractToolAdditions: Object.freeze(["line"] as const),
  rationale:
    "Plain line primitives must not be coerced into arrow annotations; extend AnnotationTool with 'line' during C12 integration.",
});

export function toContractEllipseAnnotation(
  shape: ShapePrimitiveAnnotation,
): Annotation {
  if (shape.kind !== "ellipse") {
    throw new Error(
      `Cannot convert shape kind "${shape.kind}" to frozen Annotation without C12 'line' contract extension.`,
    );
  }
  return Object.freeze({
    id: shape.id,
    tool: "ellipse",
    points: Object.freeze([
      Object.freeze({ x: shape.points[0].x, y: shape.points[0].y }),
      Object.freeze({ x: shape.points[1].x, y: shape.points[1].y }),
    ]),
    style: Object.freeze({ ...shape.style }),
  });
}

function validateImageBounds(imageWidth: number, imageHeight: number): void {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    throw new Error("Image dimensions must be finite positive numbers.");
  }
}

export function clampShapePoint(
  point: Point,
  imageWidth: number,
  imageHeight: number,
): Point {
  validateImageBounds(imageWidth, imageHeight);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error("Shape coordinates must be finite numbers.");
  }
  return Object.freeze({
    x: Math.min(imageWidth, Math.max(0, point.x)),
    y: Math.min(imageHeight, Math.max(0, point.y)),
  });
}

export function computeEllipseGeometry(
  start: Point,
  end: Point,
  imageWidth: number,
  imageHeight: number,
): EllipseGeometry | null {
  const p0 = clampShapePoint(start, imageWidth, imageHeight);
  const p1 = clampShapePoint(end, imageWidth, imageHeight);

  const minX = Math.min(p0.x, p1.x);
  const minY = Math.min(p0.y, p1.y);
  const width = Math.abs(p1.x - p0.x);
  const height = Math.abs(p1.y - p0.y);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const rx = width / 2;
  const ry = height / 2;
  return Object.freeze({
    cx: minX + rx,
    cy: minY + ry,
    rx,
    ry,
    bounds: Object.freeze({
      x: minX,
      y: minY,
      width,
      height,
    }),
  });
}

export function computeLineGeometry(
  start: Point,
  end: Point,
  imageWidth: number,
  imageHeight: number,
): LineGeometry | null {
  const p0 = clampShapePoint(start, imageWidth, imageHeight);
  const p1 = clampShapePoint(end, imageWidth, imageHeight);

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length <= 0) {
    return null;
  }

  return Object.freeze({
    x1: p0.x,
    y1: p0.y,
    x2: p1.x,
    y2: p1.y,
    length,
    bounds: Object.freeze({
      x: Math.min(p0.x, p1.x),
      y: Math.min(p0.y, p1.y),
      width: Math.abs(dx),
      height: Math.abs(dy),
    }),
  });
}

export const DEFAULT_SHAPE_STYLE: AnnotationStyle = Object.freeze({
  color: "#ef4444",
  strokeWidth: 3,
  opacity: 1,
});

export interface ShapesOverlayProps {
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly shapes: readonly ShapePrimitiveAnnotation[];
  readonly activeKind: ShapePrimitiveKind | null;
  readonly style?: AnnotationStyle;
  readonly onShapeCreate: (shape: ShapePrimitiveAnnotation) => void;
}

interface ShapeDraft {
  readonly pointerId: number;
  readonly kind: ShapePrimitiveKind;
  readonly start: Point;
  readonly current: Point;
}

export function ShapesOverlay({
  imageWidth,
  imageHeight,
  shapes,
  activeKind,
  style = DEFAULT_SHAPE_STYLE,
  onShapeCreate,
}: ShapesOverlayProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nextIdRef = useRef<number>(1);
  const [draft, setDraft] = useState<ShapeDraft | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDraft(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const mapPointerToImage = (
    event: React.PointerEvent<SVGSVGElement>,
  ): Point | null => {
    const svg = svgRef.current;
    if (!svg || imageWidth <= 0 || imageHeight <= 0) {
      return null;
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    const rawX = ((event.clientX - rect.left) / rect.width) * imageWidth;
    const rawY = ((event.clientY - rect.top) / rect.height) * imageHeight;
    return clampShapePoint({ x: rawX, y: rawY }, imageWidth, imageHeight);
  };

  const renderShapeNode = (
    id: string,
    kind: ShapePrimitiveKind,
    p0: Point,
    p1: Point,
    shapeStyle: AnnotationStyle,
    isDraft: boolean,
  ): React.JSX.Element | null => {
    if (kind === "ellipse") {
      const geom = computeEllipseGeometry(p0, p1, imageWidth, imageHeight);
      if (!geom) {
        return null;
      }
      return (
        <ellipse
          key={id}
          data-testid={isDraft ? "draft-shape-ellipse" : `shape-${id}`}
          cx={geom.cx}
          cy={geom.cy}
          rx={geom.rx}
          ry={geom.ry}
          fill="none"
          stroke={shapeStyle.color}
          strokeWidth={shapeStyle.strokeWidth}
          strokeOpacity={shapeStyle.opacity}
        />
      );
    }

    const geom = computeLineGeometry(p0, p1, imageWidth, imageHeight);
    if (!geom) {
      return null;
    }
    return (
      <line
        key={id}
        data-testid={isDraft ? "draft-shape-line" : `shape-${id}`}
        x1={geom.x1}
        y1={geom.y1}
        x2={geom.x2}
        y2={geom.y2}
        stroke={shapeStyle.color}
        strokeWidth={shapeStyle.strokeWidth}
        strokeOpacity={shapeStyle.opacity}
        strokeLinecap="round"
      />
    );
  };

  return (
    <svg
      ref={svgRef}
      role="application"
      aria-label="Ellipse and line shape overlay"
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      onPointerDown={(event) => {
        if (event.button !== 0 || activeKind === null || draft !== null) {
          return;
        }
        const pt = mapPointerToImage(event);
        if (!pt) {
          return;
        }
        setDraft({
          pointerId: event.pointerId,
          kind: activeKind,
          start: pt,
          current: pt,
        });
      }}
      onPointerMove={(event) => {
        if (!draft || event.pointerId !== draft.pointerId) {
          return;
        }
        const pt = mapPointerToImage(event);
        if (!pt) {
          return;
        }
        setDraft((prev) =>
          prev && prev.pointerId === event.pointerId
            ? { ...prev, current: pt }
            : prev,
        );
      }}
      onPointerUp={(event) => {
        if (!draft || event.pointerId !== draft.pointerId) {
          return;
        }
        const endPt = mapPointerToImage(event) ?? draft.current;
        const activeDraft = draft;
        setDraft(null);

        const isValid =
          activeDraft.kind === "ellipse"
            ? computeEllipseGeometry(
                activeDraft.start,
                endPt,
                imageWidth,
                imageHeight,
              ) !== null
            : computeLineGeometry(
                activeDraft.start,
                endPt,
                imageWidth,
                imageHeight,
              ) !== null;

        if (!isValid) {
          return;
        }

        const seq = nextIdRef.current++;
        const tuplePoints: readonly [Point, Point] = Object.freeze([
          Object.freeze({ x: activeDraft.start.x, y: activeDraft.start.y }),
          Object.freeze({ x: endPt.x, y: endPt.y }),
        ] as const);
        onShapeCreate(
          Object.freeze({
            id: `shape-${activeDraft.kind}-${seq}`,
            kind: activeDraft.kind,
            points: tuplePoints,
            style: Object.freeze({ ...style }),
          }),
        );
      }}
      onPointerCancel={(event) => {
        if (draft && event.pointerId === draft.pointerId) {
          setDraft(null);
        }
      }}
    >
      {shapes.map((shape) =>
        renderShapeNode(
          shape.id,
          shape.kind,
          shape.points[0],
          shape.points[1],
          shape.style,
          false,
        ),
      )}
      {draft &&
        renderShapeNode(
          "draft",
          draft.kind,
          draft.start,
          draft.current,
          style,
          true,
        )}
    </svg>
  );
}
