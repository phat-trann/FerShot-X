export interface PngHeader { width: number; height: number }

const SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

export function readPngHeader(bytes: Uint8Array, maxPixels = Number.MAX_SAFE_INTEGER): PngHeader {
  if (!(bytes instanceof Uint8Array) || bytes.length < 33) throw new RangeError("incomplete PNG header");
  if (!SIGNATURE.every((value, index) => bytes[index] === value)) throw new TypeError("invalid PNG signature");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452) throw new TypeError("invalid IHDR chunk");
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width < 1 || height < 1 || width > 0x7fffffff || height > 0x7fffffff ||
      !Number.isSafeInteger(maxPixels) || maxPixels < 1 ||
      width * height > maxPixels) throw new RangeError("invalid PNG dimensions or pixel limit");
  return { width, height };
}
