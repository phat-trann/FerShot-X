import type { Rect } from "../../contracts/editor";

export interface AverageRgba { r: number; g: number; b: number; a: number }
const MAX_REGION_PIXELS = 1_000_000;

export function averageRgba(
  bytes: Uint8Array,
  imageWidth: number,
  imageHeight: number,
  region: Rect,
): AverageRgba {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("bytes must be Uint8Array");
  if (![imageWidth, imageHeight].every(Number.isSafeInteger) || imageWidth <= 0 || imageHeight <= 0) {
    throw new RangeError("image dimensions must be positive safe integers");
  }
  if (bytes.length !== imageWidth * imageHeight * 4) throw new RangeError("invalid RGBA byte length");
  if (![region.x, region.y, region.width, region.height].every(Number.isSafeInteger) ||
      region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 ||
      region.x + region.width > imageWidth || region.y + region.height > imageHeight) {
    throw new RangeError("region must be an in-bounds positive integer rectangle");
  }
  const count = region.width * region.height;
  if (!Number.isSafeInteger(count) || count > MAX_REGION_PIXELS) throw new RangeError("region is too large");

  let r = 0; let g = 0; let b = 0; let a = 0;
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      const offset = (y * imageWidth + x) * 4;
      r += bytes[offset]; g += bytes[offset + 1]; b += bytes[offset + 2]; a += bytes[offset + 3];
    }
  }
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count), a: Math.round(a / count) };
}
