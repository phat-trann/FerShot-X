export interface OutputSize { width: number; height: number }

export function planOutputSize(width: number, height: number, displayScale: number, downscale: boolean): OutputSize {
  if (![width, height].every(Number.isSafeInteger) || width <= 0 || height <= 0) throw new RangeError("invalid source dimensions");
  if (!Number.isFinite(displayScale) || displayScale <= 0) throw new RangeError("invalid display scale");
  if (!downscale || displayScale <= 1) return { width, height };
  const result = { width: Math.max(1, Math.floor(width / displayScale)), height: Math.max(1, Math.floor(height / displayScale)) };
  if (!Number.isSafeInteger(result.width) || !Number.isSafeInteger(result.height) || result.width <= 0 || result.height <= 0) throw new RangeError("invalid output dimensions");
  return result;
}
