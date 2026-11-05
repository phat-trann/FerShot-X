export interface FittedImage {
  scale: number;
  width: number;
  height: number;
}

function positiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
}

export function fitImage(
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  allowUpscale = false,
): FittedImage {
  positiveFinite(width, "width");
  positiveFinite(height, "height");
  positiveFinite(viewportWidth, "viewportWidth");
  positiveFinite(viewportHeight, "viewportHeight");
  const scale = Math.min(viewportWidth / width, viewportHeight / height);
  const fittedScale = allowUpscale ? scale : Math.min(1, scale);
  const fittedWidth = width * fittedScale;
  const fittedHeight = height * fittedScale;
  if (!Number.isFinite(fittedScale) || fittedScale <= 0 || !Number.isFinite(fittedWidth) || fittedWidth <= 0 ||
      !Number.isFinite(fittedHeight) || fittedHeight <= 0) {
    throw new RangeError("fitted dimensions must be finite and positive");
  }
  return { scale: fittedScale, width: fittedWidth, height: fittedHeight };
}
