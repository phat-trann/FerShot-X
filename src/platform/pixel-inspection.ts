import type { ImageDocument } from "../contracts/media";
import type { Point, Rect } from "../contracts/editor";
import { averageRgba, type AverageRgba } from "../features/average-rgba";
import { rgbToHex } from "../features/color/color";
import { sampleRgba, type Rgba } from "../features/pixel-sample";
import { assertImageDimensions } from "./image-limits";

export interface InspectedPixel extends Rgba { x: number; y: number; hex: string }

export interface InspectedRegion extends AverageRgba { region: Rect; hex: string }

/** Arithmetic channel mean of original decoded pixels, including alpha; no target algorithm claim. */
export async function inspectImageRegion(document: ImageDocument, region: Rect): Promise<InspectedRegion> {
  assertImageDimensions(document.width, document.height);
  const { x, y, width, height } = region;
  if (![x, y, width, height].every(Number.isSafeInteger) || x < 0 || y < 0 || width <= 0 || height <= 0 ||
      x + width > document.width || y + height > document.height || width * height > 1_000_000) {
    throw new RangeError("Choose an in-bounds region containing at most 1,000,000 pixels.");
  }
  const image = new Image(); image.src = document.src; await image.decode();
  if (image.naturalWidth !== document.width || image.naturalHeight !== document.height) throw new Error("Image dimensions changed unexpectedly.");
  const canvas = window.document.createElement("canvas"); canvas.width = width; canvas.height = height;
  try {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Region inspection is unavailable.");
    context.drawImage(image, x, y, width, height, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const value = averageRgba(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength), width, height, { x: 0, y: 0, width, height });
    return { ...value, region: { ...region }, hex: rgbToHex(value.r, value.g, value.b) };
  } finally { canvas.width = 0; canvas.height = 0; }
}

/** Samples decoded browser RGBA at source-image coordinates. No native/display capture. */
export async function inspectImagePixel(document: ImageDocument, point: Point): Promise<InspectedPixel> {
  assertImageDimensions(document.width, document.height);
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y) || point.x < 0 || point.y < 0 ||
      point.x >= document.width || point.y >= document.height) throw new RangeError("Choose a pixel within the image.");
  const image = new Image();
  image.src = document.src;
  await image.decode();
  if (image.naturalWidth !== document.width || image.naturalHeight !== document.height) {
    throw new Error("Image dimensions changed unexpectedly.");
  }
  const canvas = window.document.createElement("canvas");
  canvas.width = document.width;
  canvas.height = document.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Pixel inspection is unavailable.");
  try {
    context.drawImage(image, 0, 0);
    const data = context.getImageData(point.x, point.y, 1, 1).data;
    const rgba = sampleRgba(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), 1, 1, 0, 0);
    return { ...rgba, x: point.x, y: point.y, hex: rgbToHex(rgba.r, rgba.g, rgba.b) };
  } finally {
    canvas.width = 0; canvas.height = 0;
  }
}
