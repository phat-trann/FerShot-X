import type { Point, Rect } from "../../contracts/editor";

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

function assertPositive(value: number, name: string): void {
  assertFinite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
}

function assertFiniteResult(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} result must be finite`);
}

export function normalizeRect(start: Point, end: Point): Rect {
  assertFinite(start.x, "start.x");
  assertFinite(start.y, "start.y");
  assertFinite(end.x, "end.x");
  assertFinite(end.y, "end.y");
  const rect = {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
  assertFiniteResult(rect.width, "width");
  assertFiniteResult(rect.height, "height");
  return rect;
}

export function clampPointToImage(point: Point, imageWidth: number, imageHeight: number): Point {
  assertPositive(imageWidth, "imageWidth");
  assertPositive(imageHeight, "imageHeight");
  assertFinite(point.x, "point.x");
  assertFinite(point.y, "point.y");
  return {
    x: Math.min(imageWidth, Math.max(0, point.x)),
    y: Math.min(imageHeight, Math.max(0, point.y)),
  };
}

export function pixelsToPoints(pixels: number, displayScale: number): number {
  assertFinite(pixels, "pixels");
  assertPositive(displayScale, "displayScale");
  const points = pixels / displayScale;
  assertFiniteResult(points, "pixelsToPoints");
  return points;
}
