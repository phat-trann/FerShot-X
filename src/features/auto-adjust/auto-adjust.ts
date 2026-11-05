import type { Rect } from "../../contracts/editor";
import type { ImageDocument } from "../../contracts/media";

/**
 * Deterministic Ferby automatic tonal adjustment (`A31`).
 *
 * Evidence note:
 * Shottr's exact automatic adjustment algorithm is `UNKNOWN` in static/runtime evidence;
 * this module implements a documented, deterministic Ferby rule and does not claim
 * equivalence to Shottr's internal implementation:
 * 1. Compute integer Rec.709 luminance `Y = (54*R + 183*G + 19*B) >> 8` across all pixels
 *    with `alpha > 0` (optionally restricted to `region`).
 * 2. Determine `[lowLum, highLum]` from the luminance histogram at `lowPercentile` and
 *    `highPercentile` (defaults: `2%` and `98%`).
 * 3. If `enabled === false`, `strength === 0` (reset), or `highLum <= lowLum` (flat image),
 *    return an exact copy of the original pixels without modification.
 * 4. Otherwise linearly map each RGB channel `c` via `stretched = ((c - lowLum) * 255) / (highLum - lowLum)`,
 *    blend with original `c` by `strength` (`0..=1`), clamp to `0..=255`, and preserve the
 *    original `alpha` byte untouched.
 */

export const MAX_AUTO_ADJUST_DIMENSION = 8192;
export const MAX_AUTO_ADJUST_PIXELS = 16_777_216;

export interface AutoAdjustOptions {
  readonly enabled: boolean;
  readonly strength?: number;
  readonly lowPercentile?: number;
  readonly highPercentile?: number;
  readonly region?: Readonly<Rect>;
}

export const DEFAULT_AUTO_ADJUST_OPTIONS: Readonly<
  Required<Omit<AutoAdjustOptions, "region">>
> = Object.freeze({
  enabled: true,
  strength: 1,
  lowPercentile: 0.02,
  highPercentile: 0.98,
});

export interface AutoAdjustStats {
  readonly lowLuminance: number;
  readonly highLuminance: number;
  readonly isFlatOrBypassed: boolean;
}

export interface AutoAdjustBufferResult {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
  readonly stats: Readonly<AutoAdjustStats>;
}

export interface AutoAdjustCanvasRequest {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  readonly documentMeta?: Readonly<Pick<ImageDocument, "id" | "name">>;
  readonly options?: Readonly<AutoAdjustOptions>;
}

export interface AutoAdjustCanvasResult {
  readonly canvas: HTMLCanvasElement;
  readonly stats: Readonly<AutoAdjustStats>;
}

function validateDimensions(width: number, height: number): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_AUTO_ADJUST_DIMENSION ||
    height > MAX_AUTO_ADJUST_DIMENSION
  ) {
    throw new RangeError(
      `Dimensions (${width}x${height}) must be integers between 1 and ${MAX_AUTO_ADJUST_DIMENSION}.`,
    );
  }
  if (width * height > MAX_AUTO_ADJUST_PIXELS) {
    throw new RangeError(
      `Pixel count (${width * height}) exceeds limit (${MAX_AUTO_ADJUST_PIXELS}).`,
    );
  }
}

function resolveOptions(options?: Readonly<AutoAdjustOptions>) {
  const enabled = options?.enabled ?? DEFAULT_AUTO_ADJUST_OPTIONS.enabled;
  const strength = options?.strength ?? DEFAULT_AUTO_ADJUST_OPTIONS.strength;
  const lowPercentile =
    options?.lowPercentile ?? DEFAULT_AUTO_ADJUST_OPTIONS.lowPercentile;
  const highPercentile =
    options?.highPercentile ?? DEFAULT_AUTO_ADJUST_OPTIONS.highPercentile;

  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    throw new RangeError("strength must be a finite number between 0 and 1.");
  }
  if (
    !Number.isFinite(lowPercentile) ||
    !Number.isFinite(highPercentile) ||
    lowPercentile < 0 ||
    highPercentile > 1 ||
    lowPercentile >= highPercentile
  ) {
    throw new RangeError(
      "lowPercentile and highPercentile must satisfy 0 <= lowPercentile < highPercentile <= 1.",
    );
  }

  return { enabled, strength, lowPercentile, highPercentile };
}

function percentileFromHistogram(
  hist: Uint32Array,
  totalCount: number,
  percentile: number,
): number {
  const target = Math.max(
    0,
    Math.min(totalCount - 1, Math.floor(totalCount * percentile)),
  );
  let cumulative = 0;
  for (let lum = 0; lum < 256; lum++) {
    cumulative += hist[lum];
    if (cumulative > target) {
      return lum;
    }
  }
  return 255;
}

export function applyAutoAdjustToRgbaBuffer(
  sourceRgba: Uint8ClampedArray,
  width: number,
  height: number,
  options?: Readonly<AutoAdjustOptions>,
): AutoAdjustBufferResult {
  validateDimensions(width, height);
  const expectedLength = width * height * 4;
  if (sourceRgba.length !== expectedLength) {
    throw new RangeError(
      `RGBA buffer length (${sourceRgba.length}) does not match ${width}x${height}x4 (${expectedLength}).`,
    );
  }

  const { enabled, strength, lowPercentile, highPercentile } =
    resolveOptions(options);

  const output = new Uint8ClampedArray(sourceRgba);

  if (!enabled || strength === 0) {
    return Object.freeze({
      width,
      height,
      data: output,
      stats: Object.freeze({
        lowLuminance: 0,
        highLuminance: 255,
        isFlatOrBypassed: true,
      }),
    });
  }

  const hist = new Uint32Array(256);
  let visiblePixels = 0;

  for (let i = 0; i < sourceRgba.length; i += 4) {
    const a = sourceRgba[i + 3];
    if (a === 0) continue;
    const r = sourceRgba[i];
    const g = sourceRgba[i + 1];
    const b = sourceRgba[i + 2];
    const lum = (54 * r + 183 * g + 19 * b) >> 8;
    hist[lum] += 1;
    visiblePixels += 1;
  }

  if (visiblePixels === 0) {
    return Object.freeze({
      width,
      height,
      data: output,
      stats: Object.freeze({
        lowLuminance: 0,
        highLuminance: 0,
        isFlatOrBypassed: true,
      }),
    });
  }

  const lowLuminance = percentileFromHistogram(
    hist,
    visiblePixels,
    lowPercentile,
  );
  const highLuminance = percentileFromHistogram(
    hist,
    visiblePixels,
    highPercentile,
  );

  if (highLuminance <= lowLuminance) {
    return Object.freeze({
      width,
      height,
      data: output,
      stats: Object.freeze({
        lowLuminance,
        highLuminance,
        isFlatOrBypassed: true,
      }),
    });
  }

  const span = highLuminance - lowLuminance;
  for (let i = 0; i < sourceRgba.length; i += 4) {
    const a = sourceRgba[i + 3];
    if (a === 0) {
      output[i] = sourceRgba[i];
      output[i + 1] = sourceRgba[i + 1];
      output[i + 2] = sourceRgba[i + 2];
      output[i + 3] = 0;
      continue;
    }

    for (let c = 0; c < 3; c++) {
      const orig = sourceRgba[i + c];
      const stretched = Math.max(
        0,
        Math.min(255, ((orig - lowLuminance) * 255) / span),
      );
      const blended = Math.round(orig + (stretched - orig) * strength);
      output[i + c] = Math.max(0, Math.min(255, blended));
    }
    output[i + 3] = a;
  }

  return Object.freeze({
    width,
    height,
    data: output,
    stats: Object.freeze({
      lowLuminance,
      highLuminance,
      isFlatOrBypassed: false,
    }),
  });
}

export function renderAutoAdjustedCanvas(
  request: AutoAdjustCanvasRequest,
  createCanvas: (width: number, height: number) => HTMLCanvasElement = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  },
): AutoAdjustCanvasResult {
  if (!request.source) {
    throw new TypeError("source image is required.");
  }
  validateDimensions(request.width, request.height);

  const canvas = createCanvas(request.width, request.height);
  canvas.width = request.width;
  canvas.height = request.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable.");
  }

  ctx.clearRect(0, 0, request.width, request.height);
  ctx.drawImage(request.source, 0, 0, request.width, request.height);

  const imgData = ctx.getImageData(0, 0, request.width, request.height);
  const adjusted = applyAutoAdjustToRgbaBuffer(
    imgData.data,
    request.width,
    request.height,
    request.options,
  );
  const outImageData = new ImageData(
    new Uint8ClampedArray(adjusted.data),
    request.width,
    request.height,
  );
  ctx.putImageData(outImageData, 0, 0);

  return Object.freeze({
    canvas,
    stats: adjusted.stats,
  });
}

export function resetAutoAdjustedCanvas(
  request: Omit<AutoAdjustCanvasRequest, "options">,
  createCanvas?: (width: number, height: number) => HTMLCanvasElement,
): HTMLCanvasElement {
  return renderAutoAdjustedCanvas(
    {
      ...request,
      options: { enabled: false, strength: 0 },
    },
    createCanvas,
  ).canvas;
}

