import type { Rect } from "../../contracts/editor";

function safePositive(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${name} must be a safe integer`);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
}

export function validateCrop(rect: Rect, imageWidth: number, imageHeight: number): Rect {
  safePositive(imageWidth, "imageWidth");
  safePositive(imageHeight, "imageHeight");
  for (const [value, name] of [[rect.x, "x"], [rect.y, "y"], [rect.width, "width"], [rect.height, "height"]] as const) {
    if (!Number.isSafeInteger(value)) throw new RangeError(`${name} must be a safe integer`);
  }
  if (rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0) {
    throw new RangeError("crop must have a nonnegative origin and positive size");
  }
  if (rect.x > imageWidth - rect.width || rect.y > imageHeight - rect.height) {
    throw new RangeError("crop must fit within image bounds");
  }
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}
