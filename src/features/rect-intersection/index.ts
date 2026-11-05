import type { Rect } from "../../contracts/editor";

function valid(value: number, name: string) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

export function intersectRects(a: Rect, b: Rect): Rect | null {
  for (const [value, name] of [[a.x, "a.x"], [a.y, "a.y"], [a.width, "a.width"], [a.height, "a.height"],
    [b.x, "b.x"], [b.y, "b.y"], [b.width, "b.width"], [b.height, "b.height"]] as const) valid(value, name);
  if (a.width < 0 || a.height < 0 || b.width < 0 || b.height < 0) throw new RangeError("sizes must be nonnegative");
  const ar = a.x + a.width; const ab = a.y + a.height; const br = b.x + b.width; const bb = b.y + b.height;
  if (![ar, ab, br, bb].every(Number.isFinite)) throw new RangeError("edges must be finite");
  const x = Math.max(a.x, b.x); const y = Math.max(a.y, b.y);
  const right = Math.min(ar, br); const bottom = Math.min(ab, bb);
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}
