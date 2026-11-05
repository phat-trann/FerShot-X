export const MAX_IMAGE_DIMENSION = 16384;
export const MAX_IMAGE_PIXELS = 16777216;
export const MAX_IMPORTED_BYTES = 20 * 1024 * 1024;
export const MAX_NATIVE_BYTES = 32 * 1024 * 1024;

export class ImageLimitError extends RangeError {
  constructor() { super("Choose an image no larger than 16 megapixels and 16384 pixels per side."); this.name = "ImageLimitError"; }
}
export function assertImageDimensions(width: number, height: number): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 ||
      width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION || width * height > MAX_IMAGE_PIXELS) {
    throw new ImageLimitError();
  }
}
