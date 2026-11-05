import type { Rect } from "../../contracts/editor";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export interface ResizeDelta { x: number; y: number }

const handles = new Set<ResizeHandle>(["nw", "n", "ne", "e", "se", "s", "sw", "w"]);

function finite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

function positive(value: number, name: string): void {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
}

export function resizeRectByHandle(
  rect: Rect,
  handle: ResizeHandle,
  delta: ResizeDelta,
  imageWidth: number,
  imageHeight: number,
  minSize = 1,
): Rect {
  for (const [value, name] of [[rect.x, "x"], [rect.y, "y"], [rect.width, "width"], [rect.height, "height"],
    [delta.x, "delta.x"], [delta.y, "delta.y"]] as const) finite(value, name);
  positive(imageWidth, "imageWidth");
  positive(imageHeight, "imageHeight");
  positive(minSize, "minSize");
  if (!handles.has(handle)) throw new TypeError("invalid resize handle");
  if (rect.width <= 0 || rect.height <= 0 || rect.x < 0 || rect.y < 0 ||
      rect.x + rect.width > imageWidth || rect.y + rect.height > imageHeight ||
      minSize > imageWidth || minSize > imageHeight) throw new RangeError("rect must fit image bounds");

  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;
  if (handle.includes("w")) left = Math.min(Math.max(0, left + delta.x), right - minSize);
  if (handle.includes("e")) right = Math.max(Math.min(imageWidth, right + delta.x), left + minSize);
  if (handle.includes("n")) top = Math.min(Math.max(0, top + delta.y), bottom - minSize);
  if (handle.includes("s")) bottom = Math.max(Math.min(imageHeight, bottom + delta.y), top + minSize);
  const result = { x: left, y: top, width: right - left, height: bottom - top };
  if (![result.x, result.y, result.width, result.height].every(Number.isFinite)) {
    throw new RangeError("resize result must be finite");
  }
  return result;
}
