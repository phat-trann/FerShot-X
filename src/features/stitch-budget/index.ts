export interface StitchBudget {
  readonly width: number;
  readonly height: number;
  readonly pixels: number;
}

function safePositive(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive safe integer`);
}

export function planStitchBudget(
  frameCount: number,
  frameWidth: number,
  frameHeight: number,
  overlap: number,
  maxPixels: number,
): StitchBudget {
  safePositive(frameCount, "frameCount");
  safePositive(frameWidth, "frameWidth");
  safePositive(frameHeight, "frameHeight");
  safePositive(maxPixels, "maxPixels");
  if (!Number.isSafeInteger(overlap) || overlap < 0 || overlap >= frameHeight) {
    throw new RangeError("overlap must be a nonnegative integer smaller than frame height");
  }
  const repeatedHeight = frameCount * frameHeight;
  const overlapTotal = (frameCount - 1) * overlap;
  if (!Number.isSafeInteger(repeatedHeight) || !Number.isSafeInteger(overlapTotal)) {
    throw new RangeError("stitch dimensions exceed safe integer range");
  }
  const height = repeatedHeight - overlapTotal;
  const pixels = frameWidth * height;
  if (!Number.isSafeInteger(pixels) || pixels > maxPixels) throw new RangeError("stitch output exceeds pixel budget");
  return { width: frameWidth, height, pixels };
}
