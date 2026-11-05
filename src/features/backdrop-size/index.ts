export interface BackdropSize {
  readonly width: number;
  readonly height: number;
  readonly inset: number;
}

/**
 * Plans a centered backdrop. Fractional dimensions are rounded up independently;
 * source dimensions are never scaled or otherwise changed by this helper.
 */
export function planBackdropSize(
  sourceWidth: number,
  sourceHeight: number,
  inset: number,
  maxWidth: number,
  maxHeight: number,
  maxPixels: number,
): BackdropSize {
  if (![sourceWidth, sourceHeight].every(Number.isFinite) || sourceWidth <= 0 || sourceHeight <= 0) {
    throw new RangeError("source dimensions must be finite and positive");
  }
  if (!Number.isFinite(inset) || inset < 0) throw new RangeError("inset must be finite and nonnegative");
  if (![maxWidth, maxHeight, maxPixels].every(Number.isSafeInteger) ||
      maxWidth <= 0 || maxHeight <= 0 || maxPixels <= 0) {
    throw new RangeError("limits must be positive safe integers");
  }
  const width = Math.ceil(sourceWidth + inset * 2);
  const height = Math.ceil(sourceHeight + inset * 2);
  const pixels = width * height;
  if (![width, height, pixels].every(Number.isSafeInteger) || width > maxWidth ||
      height > maxHeight || pixels > maxPixels) {
    throw new RangeError("backdrop output exceeds limits");
  }
  return { width, height, inset };
}
