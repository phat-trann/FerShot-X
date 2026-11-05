import type { Point } from "../../contracts/editor";

export interface PointDelta { x: number; y: number }

function finite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

function positive(value: number, name: string): void {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
}

export function movePointsWithinBounds(
  points: readonly Point[],
  delta: PointDelta,
  imageWidth: number,
  imageHeight: number,
): Point[] {
  if (!Array.isArray(points) || points.length === 0) throw new RangeError("points must be non-empty");
  positive(imageWidth, "imageWidth");
  positive(imageHeight, "imageHeight");
  finite(delta.x, "delta.x");
  finite(delta.y, "delta.y");

  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  for (const point of points) {
    finite(point.x, "point.x"); finite(point.y, "point.y");
    minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
  }
  if (minX < 0 || minY < 0 || maxX > imageWidth || maxY > imageHeight ||
      maxX - minX > imageWidth || maxY - minY > imageHeight) {
    throw new RangeError("points must fit within image bounds");
  }
  const dx = Math.min(Math.max(delta.x, -minX), imageWidth - maxX);
  const dy = Math.min(Math.max(delta.y, -minY), imageHeight - maxY);
  return points.map((point) => {
    const moved = { x: point.x + dx, y: point.y + dy };
    if (!Number.isFinite(moved.x) || !Number.isFinite(moved.y)) throw new RangeError("moved point must be finite");
    return moved;
  });
}
