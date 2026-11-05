import type { Point } from "../../contracts/editor";

interface Bounds { x: number; y: number; width: number; height: number }
interface ImageSize { width: number; height: number }

const finite = (v: number, name: string) => {
  if (!Number.isFinite(v)) throw new TypeError(`${name} must be finite`);
};

export function mapClientPoint(point: Point, bounds: Bounds, imageSize: ImageSize): Point {
  [point.x, point.y, bounds.x, bounds.y].forEach((value, index) => finite(value, `value${index}`));
  [bounds.width, bounds.height, imageSize.width, imageSize.height].forEach((value, index) => {
    finite(value, `dimension${index}`);
    if (value <= 0) throw new RangeError("dimensions must be positive");
  });
  const x = (point.x - bounds.x) * imageSize.width / bounds.width;
  const y = (point.y - bounds.y) * imageSize.height / bounds.height;
  if (![x, y].every(Number.isFinite)) throw new RangeError("mapped point must be finite");
  return {
    x: Math.min(imageSize.width, Math.max(0, x)),
    y: Math.min(imageSize.height, Math.max(0, y)),
  };
}
