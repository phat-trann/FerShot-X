export interface Rgba { r: number; g: number; b: number; a: number }

export function sampleRgba(bytes: Uint8Array, width: number, height: number, x: number, y: number): Rgba {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("bytes must be Uint8Array");
  if (![width, height].every(Number.isSafeInteger) || width <= 0 || height <= 0) throw new RangeError("invalid dimensions");
  if (![x, y].every(Number.isInteger) || x < 0 || y < 0 || x >= width || y >= height) throw new RangeError("out of bounds");
  const pixels = width * height;
  if (!Number.isSafeInteger(pixels) || pixels > Number.MAX_SAFE_INTEGER / 4 || bytes.length !== pixels * 4) throw new RangeError("invalid byte length");
  const offset = (y * width + x) * 4;
  return { r: bytes[offset], g: bytes[offset + 1], b: bytes[offset + 2], a: bytes[offset + 3] };
}
