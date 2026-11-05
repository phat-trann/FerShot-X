import type { CaptureMode } from "../../contracts/media";

export const MAX_WINDOW_DIMENSION = 8192;
export const MAX_WINDOW_PIXELS = 33_554_432;

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Explicit caller-provided shadow-trim crop insets in source pixels.
 * Target Shottr automatic shadow-trim heuristics are not invented here;
 * callers supply exact deterministic trim insets when trimming window shadow margins.
 */
export interface ShadowTrimInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export type WindowBackgroundAppearance =
  | { readonly kind: "transparent" }
  | { readonly kind: "solid"; readonly color: string }
  | {
      readonly kind: "wallpaper";
      readonly image: CanvasImageSource;
      readonly imageWidth: number;
      readonly imageHeight: number;
    };

export interface WindowAppearanceRenderRequest {
  readonly captureMode?: Extract<CaptureMode, "window">;
  readonly windowSource: CanvasImageSource;
  readonly windowWidth: number;
  readonly windowHeight: number;
  readonly background: WindowBackgroundAppearance;
  readonly shadowTrim?: ShadowTrimInsets;
}

export interface WindowAppearanceLayout {
  readonly cropX: number;
  readonly cropY: number;
  readonly outputWidth: number;
  readonly outputHeight: number;
}

function assertPositiveDimension(value: number, label: string): void {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_WINDOW_DIMENSION
  ) {
    throw new RangeError(
      `${label} must be an integer between 1 and ${MAX_WINDOW_DIMENSION}.`,
    );
  }
}

function assertNonNegativeInt(value: number, label: string): void {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_WINDOW_DIMENSION
  ) {
    throw new RangeError(
      `${label} must be an integer between 0 and ${MAX_WINDOW_DIMENSION}.`,
    );
  }
}

function validateBackground(background: WindowBackgroundAppearance): void {
  switch (background.kind) {
    case "transparent":
      return;
    case "solid":
      if (!HEX_COLOR_RE.test(background.color)) {
        throw new RangeError(
          `Invalid solid background hex color: "${background.color}".`,
        );
      }
      return;
    case "wallpaper":
      if (!background.image) {
        throw new TypeError("Wallpaper background image source is required.");
      }
      assertPositiveDimension(background.imageWidth, "wallpaper.imageWidth");
      assertPositiveDimension(background.imageHeight, "wallpaper.imageHeight");
      if (background.imageWidth * background.imageHeight > MAX_WINDOW_PIXELS) {
        throw new RangeError(
          `Wallpaper dimensions (${background.imageWidth}x${background.imageHeight}) exceed pixel cap (${MAX_WINDOW_PIXELS}).`,
        );
      }
      return;
  }
}

export function computeWindowAppearanceLayout(
  request: WindowAppearanceRenderRequest,
): WindowAppearanceLayout {
  if (!request.windowSource) {
    throw new TypeError("windowSource is required.");
  }
  assertPositiveDimension(request.windowWidth, "windowWidth");
  assertPositiveDimension(request.windowHeight, "windowHeight");

  if (request.windowWidth * request.windowHeight > MAX_WINDOW_PIXELS) {
    throw new RangeError(
      `Window dimensions (${request.windowWidth}x${request.windowHeight}) exceed pixel cap (${MAX_WINDOW_PIXELS}).`,
    );
  }

  validateBackground(request.background);

  const top = request.shadowTrim?.top ?? 0;
  const right = request.shadowTrim?.right ?? 0;
  const bottom = request.shadowTrim?.bottom ?? 0;
  const left = request.shadowTrim?.left ?? 0;

  assertNonNegativeInt(top, "shadowTrim.top");
  assertNonNegativeInt(right, "shadowTrim.right");
  assertNonNegativeInt(bottom, "shadowTrim.bottom");
  assertNonNegativeInt(left, "shadowTrim.left");

  const outputWidth = request.windowWidth - left - right;
  const outputHeight = request.windowHeight - top - bottom;

  if (outputWidth < 1 || outputHeight < 1) {
    throw new RangeError(
      `shadowTrim insets (${top},${right},${bottom},${left}) leave non-positive output dimensions (${outputWidth}x${outputHeight}).`,
    );
  }

  return Object.freeze({
    cropX: left,
    cropY: top,
    outputWidth,
    outputHeight,
  });
}

export function renderWindowAppearanceToCanvas(
  request: WindowAppearanceRenderRequest,
  createCanvas: (width: number, height: number) => HTMLCanvasElement = (w, h) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return canvas;
  },
): HTMLCanvasElement {
  const layout = computeWindowAppearanceLayout(request);
  const canvas = createCanvas(layout.outputWidth, layout.outputHeight);
  canvas.width = layout.outputWidth;
  canvas.height = layout.outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable.");
  }

  ctx.clearRect(0, 0, layout.outputWidth, layout.outputHeight);

  if (request.background.kind === "solid") {
    ctx.save();
    ctx.fillStyle = request.background.color;
    ctx.fillRect(0, 0, layout.outputWidth, layout.outputHeight);
    ctx.restore();
  } else if (request.background.kind === "wallpaper") {
    ctx.save();
    ctx.drawImage(
      request.background.image,
      0,
      0,
      request.background.imageWidth,
      request.background.imageHeight,
      0,
      0,
      layout.outputWidth,
      layout.outputHeight,
    );
    ctx.restore();
  }

  ctx.save();
  ctx.drawImage(
    request.windowSource,
    layout.cropX,
    layout.cropY,
    layout.outputWidth,
    layout.outputHeight,
    0,
    0,
    layout.outputWidth,
    layout.outputHeight,
  );
  ctx.restore();

  return canvas;
}

export async function renderWindowAppearanceToPngBlob(
  request: WindowAppearanceRenderRequest,
): Promise<Blob> {
  const canvas = renderWindowAppearanceToCanvas(request);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas PNG encoding failed."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

