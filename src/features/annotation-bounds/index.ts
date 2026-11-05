import type { Annotation, Rect } from "../../contracts/editor";

/** Geometric point bounds; arrowheads and text glyphs are not painted-pixel bounds. */
export function annotationBounds(annotation: Annotation): Rect | null {
  if (!["rectangle", "arrow", "pen"].includes(annotation.tool)) throw new TypeError("unsupported annotation tool");
  if (!Number.isFinite(annotation.style.strokeWidth) || annotation.style.strokeWidth <= 0) throw new RangeError("invalid stroke width");
  if (!annotation.points.length) return null;
  for (const point of annotation.points) if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new TypeError("points must be finite");
  let minX = annotation.points[0].x;
  let maxX = annotation.points[0].x;
  let minY = annotation.points[0].y;
  let maxY = annotation.points[0].y;
  for (const point of annotation.points.slice(1)) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const padding = annotation.style.strokeWidth / 2;
  const x = minX - padding; const y = minY - padding;
  const right = maxX + padding; const bottom = maxY + padding;
  if (![x, y, right, bottom].every(Number.isFinite)) throw new RangeError("bounds must be finite");
  const width = right - x;
  const height = bottom - y;
  if (!Number.isFinite(width) || !Number.isFinite(height)) throw new RangeError("bounds size must be finite");
  return { x, y, width, height };
}
